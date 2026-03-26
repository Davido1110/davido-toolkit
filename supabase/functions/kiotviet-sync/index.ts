// Supabase Edge Function — KiotViet Sync
// Deploy: supabase functions deploy kiotviet-sync --no-verify-jwt
//
// Required Supabase secrets:
//   KIOTVIET_CLIENT_ID, KIOTVIET_CLIENT_SECRET, KIOTVIET_RETAILER (=phohangda)
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
    is_excluded:   EXCLUDED_CATEGORY_IDS.has(c.categoryId),
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

// ─── Sync orders — parallel page fetching ────────────────────────────────────
async function syncOrders(db: DB, fromDate: string, toDate?: string, logId?: number): Promise<number> {
  const EXCLUDED_STATUSES = new Set([4, 5]);
  const fromDateMs = new Date(fromDate).getTime();
  const toDateMs   = toDate ? new Date(toDate).getTime() : null;
  const BATCH      = 3; // pages fetched in parallel per round

  type KVOrder = {
    id: number; code: string; branchId: number; customerId: number | null;
    customerName: string | null; status: number | string;
    total: number; discount: number; createdDate: string; modifiedDate: string;
    orderDetails: Array<{ productId: number; productCode: string; productName: string; quantity: number; price: number; discount: number }>;
  };

  const fetchPage = (offset: number) =>
    kvGet('/orders', { lastModifiedFrom: fromDate, pageSize: PAGE_SIZE, currentItem: offset }) as Promise<{ data: KVOrder[]; total: number }>;

  // Fetch page 0 first to learn total count
  const first = await fetchPage(0);
  const total = first.total ?? 0;
  if (!first.data?.length) return 0;

  // Build all offsets upfront — we stop early via early-termination below
  const offsets: number[] = [];
  for (let off = 0; off < total; off += PAGE_SIZE) offsets.push(off);

  let totalSynced = 0;
  let allPastCount = 0; // consecutive batches where EVERY order is past toDate

  for (let bi = 0; bi < offsets.length; bi += BATCH) {
    const batchOffsets = offsets.slice(bi, bi + BATCH);

    // Fetch BATCH pages in parallel (reuse already-fetched page 0)
    const pages = await Promise.all(
      batchOffsets.map(off => off === 0 ? Promise.resolve(first) : fetchPage(off))
    );

    const batchOrders = pages.flatMap(p => p.data ?? []);
    if (!batchOrders.length) break;

    // Early termination: all orders in this batch are past toDate → no more in-range pages
    if (toDateMs !== null) {
      const allPast = batchOrders.every(o =>
        new Date(o.modifiedDate ?? o.createdDate).getTime() > toDateMs
      );
      if (allPast) { if (++allPastCount >= 1) break; }
      else allPastCount = 0;
    }

    // Split active vs cancelled
    const activeOrders: KVOrder[] = [];
    const cancelledIds: number[] = [];
    for (const o of batchOrders) {
      const s = typeof o.status === 'number' ? o.status : parseInt(String(o.status), 10) || 0;
      if (EXCLUDED_STATUSES.has(s)) cancelledIds.push(o.id);
      else activeOrders.push(o);
    }

    // Keep only orders created within [fromDate, toDate] for week backfill
    const filteredOrders = toDateMs !== null
      ? activeOrders.filter(o => {
          const ms = new Date(o.createdDate).getTime();
          return ms >= fromDateMs && ms <= toDateMs;
        })
      : activeOrders;

    if (filteredOrders.length || cancelledIds.length) {
      const orderIds    = filteredOrders.map(o => o.id);
      const allCleanIds = [...orderIds, ...cancelledIds];
      const orderRows   = filteredOrders.map(o => ({
        order_id: o.id, order_code: o.code, branch_id: o.branchId,
        customer_id: o.customerId, customer_name: o.customerName,
        status: typeof o.status === 'number' ? o.status : parseInt(String(o.status), 10) || 0,
        total: o.total ?? 0, discount: o.discount ?? 0,
        order_date: o.createdDate, modified_date: o.modifiedDate ?? o.createdDate,
      }));

      // Parallel: delete stale details + upsert headers
      await Promise.all([
        allCleanIds.length ? db.from('order_details').delete().in('order_id', allCleanIds) : Promise.resolve(),
        orderRows.length   ? db.from('orders').upsert(orderRows, { onConflict: 'order_id' }).then(({ error }) => { if (error) throw dbErr(error); }) : Promise.resolve(),
      ]);

      const detailRows = filteredOrders.flatMap(o =>
        (o.orderDetails ?? []).map(d => ({
          order_id: o.id, product_id: d.productId, product_code: d.productCode ?? '',
          product_name: d.productName ?? '', quantity: d.quantity ?? 0,
          price: d.price ?? 0, discount: d.discount ?? 0,
        }))
      );
      if (detailRows.length) {
        const { error: dErr } = await db.from('order_details').insert(detailRows);
        if (dErr) throw dbErr(dErr);
      }
      if (cancelledIds.length) await db.from('orders').delete().in('order_id', cancelledIds);

      totalSynced += filteredOrders.length;
    }

    if (logId) await updateSyncProgress(db, logId, totalSynced);
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
async function computeAvgWeeklySales(db: DB): Promise<Map<number, number>> {
  const now = new Date();
  const dayOfWeek = now.getUTCDay() || 7;
  const startOfCurrentWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  startOfCurrentWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - (dayOfWeek - 1));

  const windowStart = new Date(startOfCurrentWeek);
  windowStart.setUTCDate(windowStart.getUTCDate() - 12 * 7);

  // Step 1: fetch qualifying orders from DB
  const { data: qualifyingOrders, error: oErr } = await db.from('orders')
    .select('order_id, order_date')
    .gte('order_date', windowStart.toISOString())
    .lt('order_date', startOfCurrentWeek.toISOString())
    .in('status', [1, 2, 3])
    .in('branch_id', Array.from(INCLUDED_BRANCH_IDS));
  if (oErr) throw dbErr(oErr);

  const orderDateMap = new Map<number, string>(
    (qualifyingOrders ?? []).map(o => [o.order_id, o.order_date])
  );
  const orderIds = [...orderDateMap.keys()];
  if (!orderIds.length) return new Map();

  // Step 2: fetch order details in chunks of 500 to stay within URL limits
  const CHUNK = 500;
  const weeklyQty = new Map<number, Map<string, number>>();

  for (let i = 0; i < orderIds.length; i += CHUNK) {
    const chunk = orderIds.slice(i, i + CHUNK);
    const { data: details, error: dErr } = await db.from('order_details')
      .select('product_id, quantity, order_id')
      .in('order_id', chunk);
    if (dErr) throw dbErr(dErr);

    for (const row of details ?? []) {
      const orderDate = orderDateMap.get(row.order_id);
      if (!orderDate) continue;
      const weekKey = isoWeekKey(new Date(orderDate));
      if (!weeklyQty.has(row.product_id)) weeklyQty.set(row.product_id, new Map());
      const wMap = weeklyQty.get(row.product_id)!;
      wMap.set(weekKey, (wMap.get(weekKey) ?? 0) + (row.quantity ?? 0));
    }
  }

  // Step 3: compute averages (exclude zero-weeks)
  const avgMap = new Map<number, number>();
  for (const [productId, wMap] of weeklyQty) {
    const nonZeroWeeks = [...wMap.values()].filter(q => q > 0);
    if (nonZeroWeeks.length > 0) {
      avgMap.set(productId, nonZeroWeeks.reduce((a, b) => a + b, 0) / nonZeroWeeks.length);
    }
  }

  return avgMap;
}

// Categories excluded from product sync
const EXCLUDED_CATEGORY_IDS = new Set([932972, 932976, 932977, 932987, 932989, 1421325, 1437867, 1547533, 1547557, 1547558, 1547559]);

// Branches included in stock totals and sales avg
const INCLUDED_BRANCH_IDS = new Set([63006, 87057, 174933, 211703, 211844, 212056, 313226, 323430, 1000000021]);

// ─── Sync inventory + products (avg_weekly_sales from DB) ─────────────────────
async function syncInventory(db: DB, branchIds: number[], fromDate: string | null, logId?: number): Promise<number> {
  // Compute avg from DB — fast, no KiotViet calls
  const avgMap = await computeAvgWeeklySales(db);

  let currentItem = 0;
  let totalSynced = 0;

  const branchParams = Array.from(INCLUDED_BRANCH_IDS).map(id => `BranchIds=${id}`).join('&');

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
    const products = allProducts.filter(p => p.code && !EXCLUDED_CATEGORY_IDS.has(p.categoryId!));
    if (!allProducts.length) break;

    const productRows = products.map(p => {
      const included = (p.inventories ?? []).filter(inv => INCLUDED_BRANCH_IDS.has(inv.branchId));
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
        on_hand:          included.reduce((s, inv) => s + (inv.onHand  ?? 0), 0),
        on_order:         included.reduce((s, inv) => s + (inv.onOrder ?? 0), 0),
        reserved:         included.reduce((s, inv) => s + (inv.reserved ?? 0), 0),
        avg_weekly_sales: avgMap.get(p.id) ?? 0,
      };
    });
    const { error: pErr } = await db.from('products').upsert(productRows, { onConflict: 'product_id' });
    if (pErr) throw dbErr(pErr);

    totalSynced += products.length;
    currentItem += allProducts.length;
    if (logId) await updateSyncProgress(db, logId, totalSynced);
    if (currentItem >= page.total) break;
  }

  // Clean up inactive / excluded-category products
  const excludedCatArray = Array.from(EXCLUDED_CATEGORY_IDS);
  const { data: staleProducts } = await db.from('products').select('product_id')
    .or(`is_active.eq.false,category_id.in.(${excludedCatArray.join(',')})`);
  const staleIds = (staleProducts ?? []).map((p: { product_id: number }) => p.product_id);
  if (staleIds.length) {
    await db.from('products').delete().in('product_id', staleIds);
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

    // 1. Branches — skip for orders-only backfill (not needed)
    let branchIds: number[] = [];
    if (syncType !== 'orders') {
      const branchCount = await syncBranches(db);
      totalRecords += branchCount;
    }
    const { data: branches } = await db.from('branches').select('branch_id').eq('is_active', true);
    branchIds = (branches ?? []).map((b: { branch_id: number }) => b.branch_id);

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
      const orderCount = await syncOrders(db, fromDate, toDate, logId);
      totalRecords += orderCount;
    }

    // 4. Inventory + Products (avg_weekly_sales computed from DB — fast)
    if (syncType === 'full' || syncType === 'inventory' || syncType === 'products') {
      const fromDateForProducts = syncType === 'inventory' ? lastSync : null;
      const invCount = await syncInventory(db, branchIds, fromDateForProducts, logId);
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
