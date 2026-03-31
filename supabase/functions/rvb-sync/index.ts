// Supabase Edge Function — RVB Stock Forecast Sync
// Deploy: supabase functions deploy rvb-sync --no-verify-jwt
//
// Required Supabase secrets:
//   KIOTVIET_CLIENT_ID, KIOTVIET_CLIENT_SECRET, KIOTVIET_RETAILER (=ranverbae)
// Auto-injected by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const KV_TOKEN_URL = 'https://id.kiotviet.vn/connect/token';
const KV_API_BASE  = 'https://public.kiotapi.com';
const PAGE_SIZE    = 100;
const RATE_LIMIT   = 4800;

// ─── Token cache ──────────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiresAt - 5 * 60 * 1000) return _token;
  const res = await fetch(KV_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     Deno.env.get('KIOTVIET_CLIENT_ID')!,
      client_secret: Deno.env.get('KIOTVIET_CLIENT_SECRET')!,
      scopes:        'PublicApi.Access',
    }),
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  _token = data.access_token;
  _tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return _token!;
}

// ─── KiotViet GET ─────────────────────────────────────────────────────────────
let requestCount = 0;

async function kvGet(path: string, params: Record<string, string | number | boolean> = {}): Promise<unknown> {
  if (requestCount >= RATE_LIMIT) throw new Error('RATE_LIMIT_REACHED');

  const url = new URL(KV_API_BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  for (let attempt = 1; attempt <= 3; attempt++) {
    const token = await getToken();
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Retailer: Deno.env.get('KIOTVIET_RETAILER')!,
      },
    });
    requestCount++;

    if (res.status === 401) { _token = null; if (attempt === 3) throw new Error('Auth failed'); continue; }
    if (res.status === 429) throw new Error('RATE_LIMIT_REACHED');
    if (res.status >= 500) {
      if (attempt === 3) throw new Error(`KV server error ${res.status}`);
      await sleep(5000 * attempt);
      continue;
    }
    if (!res.ok) throw new Error(`KV ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error('kvGet: exhausted retries');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Supabase ─────────────────────────────────────────────────────────────────
function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

type DB = ReturnType<typeof getSupabase>;

function dbErr(error: unknown): Error {
  if (!error) return new Error('unknown db error');
  if (error instanceof Error) return error;
  const e = error as { message?: string };
  return new Error(e.message ?? JSON.stringify(error));
}

async function createSyncLog(db: DB, syncType: string, branchId: number | null): Promise<number> {
  const { data, error } = await db.from('sync_logs')
    .insert({ sync_type: syncType, status: 'running', branch_id: branchId })
    .select('id').single();
  if (error) throw dbErr(error);
  return data.id;
}

async function finishSyncLog(db: DB, logId: number, status: string, records: number, errMsg: string | null = null) {
  await db.from('sync_logs').update({
    status, finished_at: new Date().toISOString(),
    records_synced: records, requests_used: requestCount, error_message: errMsg,
  }).eq('id', logId);
}

async function updateSyncProgress(db: DB, logId: number, records: number) {
  await db.from('sync_logs').update({ records_synced: records, requests_used: requestCount }).eq('id', logId);
}

async function getLastSyncTime(db: DB): Promise<string | null> {
  const { data } = await db.from('sync_logs')
    .select('finished_at').eq('status', 'success')
    .order('finished_at', { ascending: false }).limit(1).single();
  return data?.finished_at ?? null;
}

// ─── Sync product categories ──────────────────────────────────────────────────
async function syncCategories(db: DB): Promise<number> {
  const res = await kvGet('/categories') as { data: Array<{ categoryId: number; categoryName: string; parentId: number | null; hasChild?: boolean; isActive?: boolean }> };
  const rows = (res.data ?? []).map(c => ({
    category_id:   c.categoryId,
    category_name: c.categoryName,
    parent_id:     c.parentId ?? null,
    has_child:     c.hasChild ?? false,
    is_active:     c.isActive ?? true,
    is_excluded:   false,
    synced_at:     new Date().toISOString(),
  }));
  if (!rows.length) return 0;
  const { error } = await db.from('product_categories').upsert(rows, { onConflict: 'category_id' });
  if (error) throw dbErr(error);
  return rows.length;
}

// ─── Sync branches ────────────────────────────────────────────────────────────
async function syncBranches(db: DB): Promise<number> {
  const res = await kvGet('/branches') as { data: Array<{ id: number; branchName: string; isActive?: boolean }> };
  const rows = (res.data ?? []).map(b => ({
    branch_id: b.id,
    branch_name: b.branchName,
    is_warehouse_only: false,
    is_active: b.isActive ?? true,
    synced_at: new Date().toISOString(),
  }));
  if (!rows.length) return 0;
  const { error } = await db.from('branches').upsert(rows, { onConflict: 'branch_id' });
  if (error) throw dbErr(error);
  return rows.length;
}

// ─── Sync invoices — parallel page fetching ───────────────────────────────────
async function syncOrders(db: DB, includedBranchIds: Set<number>, fromDate: string, toDate?: string, logId?: number): Promise<number> {
  const EXCLUDED_STATUSES = new Set([4, 5]);
  const fromDateMs = new Date(fromDate).getTime();
  const toDateMs   = toDate ? new Date(toDate).getTime() : null;
  const API_BATCH  = 10;
  const WRITE_CHUNK = 2000;

  type KVOrder = {
    id: number; code: string; branchId: number; customerId: number | null;
    customerName: string | null; status: number | string;
    total: number; purchaseDate: string; modifiedDate: string;
    invoiceDetails: Array<{ productId: number; productCode: string; productName: string; quantity: number; price: number; discount: number | null }>;
  };

  const branchFilter = Array.from(includedBranchIds).map(id => `branchIds=${id}`).join('&');

  const fetchPage = (offset: number) => {
    const params = toDate
      ? { fromPurchaseDate: fromDate, toPurchaseDate: toDate, pageSize: PAGE_SIZE, currentItem: offset }
      : { lastModifiedFrom: fromDate, pageSize: PAGE_SIZE, currentItem: offset };
    return kvGet(`/invoices?${branchFilter}`, params) as Promise<{ data: KVOrder[]; total: number }>;
  };

  const first = await fetchPage(0);
  const total = first.total ?? 0;
  console.log(`[invoice-sync] params: fromDate=${fromDate} toDate=${toDate ?? 'none'} total=${total}`);
  if (!first.data?.length) return 0;

  const allRaw: KVOrder[] = [...(first.data ?? [])];
  const remainingOffsets: number[] = [];
  for (let off = PAGE_SIZE; off < total; off += PAGE_SIZE) remainingOffsets.push(off);

  for (let bi = 0; bi < remainingOffsets.length; bi += API_BATCH) {
    const batch = remainingOffsets.slice(bi, bi + API_BATCH);
    const pages = await Promise.all(batch.map(off => fetchPage(off)));
    for (const p of pages) allRaw.push(...(p.data ?? []));
    console.log(`[invoice-sync] fetched offsets ${batch[0]}–${batch[batch.length-1]+PAGE_SIZE-1} (accumulated ${allRaw.length})`);
  }

  const seenIds = new Set<number>();
  const activeOrders: KVOrder[] = [];
  const cancelledIds: number[] = [];

  for (const o of allRaw) {
    if (seenIds.has(o.id)) continue;
    seenIds.add(o.id);

    const s = typeof o.status === 'number' ? o.status : parseInt(String(o.status), 10) || 0;
    if (EXCLUDED_STATUSES.has(s)) { cancelledIds.push(o.id); continue; }

    if (toDateMs !== null) {
      const ms = new Date(o.purchaseDate).getTime();
      if (ms < fromDateMs || ms > toDateMs) continue;
    }
    activeOrders.push(o);
  }

  console.log(`[invoice-sync] after filter: active=${activeOrders.length} cancelled=${cancelledIds.length}`);

  if (cancelledIds.length) await db.from('invoices').delete().in('invoice_id', cancelledIds);

  let totalSynced = 0;
  for (let i = 0; i < activeOrders.length; i += WRITE_CHUNK) {
    const chunk = activeOrders.slice(i, i + WRITE_CHUNK);
    const chunkIds = chunk.map(o => o.id);
    const invoiceRows = chunk.map(o => ({
      invoice_id: o.id, invoice_code: o.code, branch_id: o.branchId,
      customer_id: o.customerId, customer_name: o.customerName,
      status: typeof o.status === 'number' ? o.status : parseInt(String(o.status), 10) || 0,
      total: o.total ?? 0, discount: 0,
      invoice_date: o.purchaseDate, modified_date: o.modifiedDate ?? o.purchaseDate,
    }));

    await Promise.all([
      db.from('invoice_details').delete().in('invoice_id', chunkIds),
      db.from('invoices').upsert(invoiceRows, { onConflict: 'invoice_id' }).then(({ error }) => { if (error) throw dbErr(error); }),
    ]);

    const detailRows = chunk.flatMap(o =>
      (o.invoiceDetails ?? []).map(d => ({
        invoice_id: o.id, product_id: d.productId, product_code: d.productCode ?? '',
        product_name: d.productName ?? '', quantity: d.quantity ?? 0,
        price: d.price ?? 0, discount: d.discount ?? 0,
      }))
    );
    if (detailRows.length) {
      const { error: dErr } = await db.from('invoice_details').insert(detailRows);
      if (dErr) throw dbErr(dErr);
    }

    totalSynced += chunk.length;
    if (logId) await updateSyncProgress(db, logId, totalSynced);
    console.log(`[invoice-sync] wrote chunk ${i/WRITE_CHUNK + 1}: ${totalSynced}/${activeOrders.length}`);
  }

  return totalSynced;
}

// ─── ISO week key ─────────────────────────────────────────────────────────────
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── Compute avg weekly sales per SKU from DB (last 12 complete weeks) ────────
async function computeAvgWeeklySales(db: DB, includedBranchIds: Set<number>): Promise<Map<number, number>> {
  const now = new Date();
  const dayOfWeek = now.getUTCDay() || 7;
  const startOfCurrentWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  startOfCurrentWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - (dayOfWeek - 1));

  const windowStart = new Date(startOfCurrentWeek);
  windowStart.setUTCDate(windowStart.getUTCDate() - 12 * 7);

  console.log(`[avg-sales] window: ${windowStart.toISOString()} → ${startOfCurrentWeek.toISOString()}`);

  const branchList = Array.from(includedBranchIds).join(',');
  const weeklyQty = new Map<number, Map<string, number>>();
  let detailOffset = 0;
  const PAGE = 1000;

  while (true) {
    const { data: rows, error: dErr } = await db.from('invoice_details')
      .select('product_id, quantity, invoices!inner(invoice_date)')
      .filter('invoices.invoice_date', 'gte', windowStart.toISOString())
      .filter('invoices.invoice_date', 'lt', startOfCurrentWeek.toISOString())
      .filter('invoices.status', 'in', `(1,2,3)`)
      .filter('invoices.branch_id', 'in', `(${branchList})`)
      .order('id')
      .range(detailOffset, detailOffset + PAGE - 1);
    if (dErr) throw dbErr(dErr);
    if (!rows?.length) break;

    for (const row of rows) {
      const inv = (row as any).invoices;
      const invoiceDate = Array.isArray(inv) ? inv[0]?.invoice_date : inv?.invoice_date;
      if (!invoiceDate) continue;
      const weekKey = isoWeekKey(new Date(invoiceDate));
      if (!weeklyQty.has(row.product_id)) weeklyQty.set(row.product_id, new Map());
      const wMap = weeklyQty.get(row.product_id)!;
      wMap.set(weekKey, (wMap.get(weekKey) ?? 0) + (row.quantity ?? 0));
    }

    if (rows.length < PAGE) break;
    detailOffset += PAGE;
    if (detailOffset % 10000 === 0) console.log(`[avg-sales] details scanned: ${detailOffset}`);
  }

  const avgMap = new Map<number, number>();
  for (const [productId, wMap] of weeklyQty) {
    const activeWeeks = [...wMap.values()].filter(q => q > 0);
    if (activeWeeks.length > 0) {
      avgMap.set(productId, activeWeeks.reduce((a, b) => a + b, 0) / activeWeeks.length);
    }
  }

  return avgMap;
}

// ─── Sync inventory + products ────────────────────────────────────────────────
async function syncInventory(db: DB, includedBranchIds: Set<number>, fromDate: string | null, logId?: number): Promise<number> {
  const avgMap = await computeAvgWeeklySales(db, includedBranchIds);

  let currentItem = 0;
  let totalSynced = 0;

  const branchParams = Array.from(includedBranchIds).map(id => `BranchIds=${id}`).join('&');

  while (true) {
    const url = `${KV_API_BASE}/products?includeInventory=true&isActive=true&pageSize=${PAGE_SIZE}&currentItem=${currentItem}${fromDate ? `&lastModifiedFrom=${fromDate}` : ''}&${branchParams}`;

    if (requestCount >= RATE_LIMIT) throw new Error('RATE_LIMIT_REACHED');

    const token = await getToken();
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Retailer: Deno.env.get('KIOTVIET_RETAILER')!,
      },
    });
    requestCount++;

    if (!res.ok) throw new Error(`Products API ${res.status}: ${await res.text()}`);

    const page = await res.json() as { data: Array<{
      id: number; code: string; name: string; fullName: string;
      categoryId: number | null; categoryName: string | null;
      basePrice: number; isActive: boolean; modifiedDate: string;
      inventories: Array<{ branchId: number; onHand: number; onOrder: number; reserved: number }>;
    }>; total: number };

    const allProducts = page.data ?? [];
    const products = allProducts.filter(p => p.code);
    if (!allProducts.length) break;

    const productRows = products.map(p => {
      const included = (p.inventories ?? []).filter(inv => includedBranchIds.has(inv.branchId));
      const onHand   = included.reduce((s, inv) => s + (inv.onHand   ?? 0), 0);
      const onOrder  = included.reduce((s, inv) => s + (inv.onOrder  ?? 0), 0);
      const reserved = included.reduce((s, inv) => s + (inv.reserved ?? 0), 0);
      const avgSales = avgMap.get(p.id) ?? 0;
      return {
        product_id:       p.id,
        code:             p.code,
        name:             p.name,
        full_name:        p.fullName,
        category_id:      p.categoryId,
        category_name:    p.categoryName,
        base_price:       p.basePrice,
        is_active:        p.isActive ?? true,
        modified_date:    p.modifiedDate,
        on_hand:          onHand,
        on_order:         onOrder,
        reserved:         reserved,
        avg_weekly_sales: avgSales,
        weeks_left:       avgSales > 0 ? (onHand + onOrder - reserved) / avgSales : null,
      };
    });

    const branchInventoryRows = products.flatMap(p =>
      (p.inventories ?? [])
        .filter(inv => includedBranchIds.has(inv.branchId))
        .map(inv => ({
          product_id: p.id,
          branch_id:  inv.branchId,
          on_hand:    inv.onHand  ?? 0,
          on_order:   inv.onOrder ?? 0,
          reserved:   inv.reserved ?? 0,
        }))
    );

    const [pRes, biRes] = await Promise.all([
      db.from('products').upsert(productRows, { onConflict: 'product_id' }),
      branchInventoryRows.length
        ? db.from('product_inventory_by_branch').upsert(branchInventoryRows, { onConflict: 'product_id,branch_id' })
        : Promise.resolve({ error: null }),
    ]);
    if (pRes.error)  throw dbErr(pRes.error);
    if (biRes.error) throw dbErr(biRes.error);

    totalSynced += products.length;
    currentItem += allProducts.length;
    if (logId) await updateSyncProgress(db, logId, totalSynced);
    if (currentItem >= page.total) break;
  }

  return totalSynced;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  requestCount = 0;
  const db = getSupabase();
  let logId: number | null = null;
  let totalRecords = 0;

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const syncType: string = body.sync_type ?? 'products';
    const branchId: number | null = body.branch_id ?? null;

    const validTypes = ['orders', 'inventory', 'full', 'categories', 'branches', 'products'];
    const logSyncType = validTypes.includes(syncType) ? syncType : 'products';
    logId = await createSyncLog(db, logSyncType, branchId);

    const lastSync = await getLastSyncTime(db);

    // 1. Branches — always sync first to have up-to-date branch list
    if (syncType !== 'orders') {
      const branchCount = await syncBranches(db);
      totalRecords += branchCount;
    }
    const { data: branches } = await db.from('branches').select('branch_id').eq('is_active', true);
    const includedBranchIds = new Set<number>((branches ?? []).map((b: { branch_id: number }) => b.branch_id));

    // 2. Product categories
    if (syncType === 'full' || syncType === 'categories') {
      const categoryCount = await syncCategories(db);
      totalRecords += categoryCount;
    }

    // 3. Orders — week-batch backfill or incremental
    if (syncType === 'orders' || syncType === 'full') {
      const fromDate: string = body.from_date ?? lastSync ?? (() => {
        const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString();
      })();
      const toDate: string | undefined = body.to_date;
      const orderCount = await syncOrders(db, includedBranchIds, fromDate, toDate, logId);
      totalRecords += orderCount;
    }

    // 4. Inventory + Products
    if (syncType === 'full' || syncType === 'inventory' || syncType === 'products') {
      const fromDateForProducts = syncType === 'inventory' ? lastSync : null;
      const invCount = await syncInventory(db, includedBranchIds, fromDateForProducts, logId);
      totalRecords += invCount;
    }

    await finishSyncLog(db, logId, 'success', totalRecords);

    return new Response(
      JSON.stringify({ ok: true, records_synced: totalRecords, requests_used: requestCount }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message
      : (typeof err === 'object' ? JSON.stringify(err) : String(err));
    const isRateLimit = msg === 'RATE_LIMIT_REACHED';

    if (logId) await finishSyncLog(db, logId, isRateLimit ? 'partial' : 'failed', totalRecords, msg);

    return new Response(
      JSON.stringify({ ok: false, error: msg, requests_used: requestCount }),
      { status: isRateLimit ? 429 : 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
