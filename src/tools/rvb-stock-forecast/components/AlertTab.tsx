import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getSupabase } from '../lib/supabase';

interface AlertRow {
  product_id: number;
  code: string;
  name: string;
  full_name: string;
  category_name: string | null;
  avg_weekly_sales: number;
  on_hand: number;
  on_order: number;
  reserved: number;
  weeks_left: number | null;
}

interface ProductGroup {
  name: string;
  category_name: string | null;
  skus: AlertRow[];
  total_avg: number;
  total_on_hand: number;
  total_on_order: number;
  total_reserved: number;
  group_weeks_left: number | null; // (on_hand+on_order-reserved)/avg_weekly_sales
  min_weeks_left: number | null;   // worst SKU
}

type UrgencyFilter = '' | 'negative' | 'urgent' | 'soon' | 'low' | 'ok';
type GroupSortField = 'name' | 'category_name' | 'total_avg' | 'total_on_hand' | 'total_on_order' | 'total_reserved' | 'group_weeks_left';
type SortField = 'code' | 'full_name' | 'category_name' | 'avg_weekly_sales' | 'on_hand' | 'on_order' | 'reserved' | 'weeks_left';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grouped' | 'flat';

function getNote(weeksLeft: number | null): string {
  if (weeksLeft === null) return '—';
  if (weeksLeft < 0)  return '⚠️ Âm kho — đặt hàng gấp';
  if (weeksLeft < 4)  return '🔴 Cần đặt hàng gấp (< 4 tuần)';
  if (weeksLeft < 8)  return '🟡 Cần đặt hàng sớm (4–8 tuần)';
  if (weeksLeft < 12) return '🟢 Sắp thiếu hàng (8–12 tuần)';
  return '— (hiển thị do nhóm)';
}

function weeksColor(w: number | null): string {
  if (w === null) return 'text-gray-300';
  if (w < 0)  return 'text-orange-600 dark:text-orange-400';
  if (w < 4)  return 'text-red-600 dark:text-red-400';
  if (w < 8)  return 'text-yellow-600 dark:text-yellow-400';
  if (w < 12) return 'text-green-600 dark:text-green-400';
  return 'text-gray-400';
}

function rowBg(weeksLeft: number | null): string {
  if (weeksLeft === null || weeksLeft >= 12) return '';
  if (weeksLeft < 0)  return 'bg-orange-50 dark:bg-orange-900/10';
  if (weeksLeft < 4)  return 'bg-red-50 dark:bg-red-900/10';
  if (weeksLeft < 8)  return 'bg-yellow-50 dark:bg-yellow-900/10';
  return 'bg-green-50 dark:bg-green-900/10';
}

function matchesUrgency(weeksLeft: number | null, filter: UrgencyFilter): boolean {
  if (!filter) return true;
  if (weeksLeft === null) return false;
  if (filter === 'negative') return weeksLeft < 0;
  if (filter === 'urgent')   return weeksLeft >= 0 && weeksLeft < 4;
  if (filter === 'soon')     return weeksLeft >= 4 && weeksLeft < 8;
  if (filter === 'low')      return weeksLeft >= 8 && weeksLeft < 12;
  if (filter === 'ok')       return weeksLeft >= 12;
  return true;
}

function fmtW(w: number | null): string {
  if (w === null) return 'N/A';
  return (Math.round(w * 10) / 10).toString();
}

function buildGroups(rows: AlertRow[]): ProductGroup[] {
  const map = new Map<string, AlertRow[]>();
  for (const r of rows) {
    if (!map.has(r.name)) map.set(r.name, []);
    map.get(r.name)!.push(r);
  }
  return [...map.entries()].map(([name, skus]) => {
    const total_avg      = skus.reduce((s, r) => s + r.avg_weekly_sales, 0);
    const total_on_hand  = skus.reduce((s, r) => s + r.on_hand, 0);
    const total_on_order = skus.reduce((s, r) => s + r.on_order, 0);
    const total_reserved = skus.reduce((s, r) => s + r.reserved, 0);
    const group_weeks_left = total_avg > 0
      ? (total_on_hand + total_on_order - total_reserved) / total_avg
      : null;
    const wl = skus.map(r => r.weeks_left).filter((w): w is number => w !== null);
    const min_weeks_left = wl.length ? Math.min(...wl) : null;
    return {
      name,
      category_name: skus[0].category_name ?? null,
      skus,
      total_avg,
      total_on_hand,
      total_on_order,
      total_reserved,
      group_weeks_left,
      min_weeks_left,
    };
  });
}

export default function AlertTab() {
  const db = getSupabase();
  const [allRows, setAllRows]   = useState<AlertRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [alertFamilies, setAlertFamilies] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Filters
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [urgency, setUrgency]     = useState<UrgencyFilter>('');
  const [alertOnly, setAlertOnly] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');

  // Flat sort
  const [sortField, setSortField] = useState<SortField>('weeks_left');
  const [sortDir, setSortDir]     = useState<SortDir>('asc');

  // Group sort
  const [gSortField, setGSortField] = useState<GroupSortField>('group_weeks_left');
  const [gSortDir, setGSortDir]     = useState<SortDir>('asc');

  // Expand state
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => { if (db) fetchReport(); }, []);

  async function fetchReport() {
    if (!db) return;
    setLoading(true);
    setError('');

    const { data, error: qErr } = await db.from('products')
      .select('product_id, code, name, full_name, category_name, avg_weekly_sales, on_hand, on_order, reserved, weeks_left')
      .eq('is_active', true)
      .gt('avg_weekly_sales', 0);

    if (qErr) { setError(qErr.message); setLoading(false); return; }

    const { data: syncLog } = await db
      .from('sync_logs')
      .select('finished_at')
      .eq('status', 'success')
      .in('sync_type', ['products', 'inventory', 'full'])
      .order('finished_at', { ascending: false })
      .limit(1)
      .single();
    setLastSyncedAt(syncLog?.finished_at ?? null);

    const all = (data ?? []) as AlertRow[];

    const alertNames = new Set(
      all.filter(p => p.weeks_left !== null && p.weeks_left < 12).map(p => p.name)
    );

    const report = all.filter(p => alertNames.has(p.name));
    const cats = [...new Set(report.map(r => r.category_name).filter(Boolean) as string[])].sort();

    setAlertFamilies(alertNames.size);
    setAllRows(report);
    setCategories(cats);
    setLoading(false);
  }

  // ── Filtered flat rows ───────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = allRows.filter(r => {
      if (alertOnly && (r.weeks_left === null || r.weeks_left >= 12)) return false;
      if (urgency && !matchesUrgency(r.weeks_left, urgency)) return false;
      if (category && r.category_name !== category) return false;
      if (q && !r.code.toLowerCase().includes(q) && !r.full_name.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortField] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      const bv = b[sortField] ?? (sortDir === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [allRows, search, category, urgency, alertOnly, sortField, sortDir]);

  // ── Grouped rows ─────────────────────────────────────────────────────────
  const filteredGroups = useMemo(() => {
    const groups = buildGroups(filteredRows);
    const dir = gSortDir === 'asc' ? 1 : -1;
    return [...groups].sort((a, b) => {
      const field = gSortField;
      const av = (a as unknown as Record<string, unknown>)[field] ?? (gSortDir === 'asc' ? Infinity : -Infinity);
      const bv = (b as unknown as Record<string, unknown>)[field] ?? (gSortDir === 'asc' ? Infinity : -Infinity);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [filteredRows, gSortField, gSortDir]);

  function resetFilters() {
    setSearch(''); setCategory(''); setUrgency(''); setAlertOnly(false);
    setSortField('weeks_left'); setSortDir('asc');
    setGSortField('group_weeks_left'); setGSortDir('asc');
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function toggleGSort(field: GroupSortField) {
    if (gSortField === field) setGSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setGSortField(field); setGSortDir('asc'); }
  }

  function toggleGroup(name: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  function expandAll()  { setExpandedGroups(new Set(filteredGroups.map(g => g.name))); }
  function collapseAll() { setExpandedGroups(new Set()); }

  const SI  = (f: SortField)      => sortField  === f ? (sortDir  === 'asc' ? ' ↑' : ' ↓') : '';
  const GSI = (f: GroupSortField) => gSortField === f ? (gSortDir === 'asc' ? ' ↑' : ' ↓') : '';

  function downloadExcel() {
    const header = ['Mã SKU', 'Tên sản phẩm', 'Nhóm hàng', 'Avg Weekly Sales', 'On Hand', 'On Order', 'Reserved', 'Weeks Left', 'Ghi chú'];
    const dataRows = filteredRows.map(r => [
      r.code, r.full_name, r.category_name ?? '',
      Math.round(r.avg_weekly_sales * 10) / 10,
      r.on_hand, r.on_order, r.reserved,
      r.weeks_left !== null ? Math.round(r.weeks_left * 10) / 10 : 'N/A',
      getNote(r.weeks_left),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
    ws['!cols'] = [12, 40, 20, 18, 10, 10, 10, 12, 35].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cảnh Báo Hết Hàng');
    XLSX.writeFile(wb, `canh-bao-hang-ton-rvb-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  if (!db) return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      Chưa kết nối Supabase. Vào tab Settings để cấu hình.
    </div>
  );

  const inputCls = 'px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cảnh báo hết hàng — SKU có Weeks Left &lt; 12
          </p>
          {!loading && allRows.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {alertFamilies} nhóm sản phẩm · {allRows.length} SKU · hiển thị {filteredRows.length}
            </p>
          )}
          {lastSyncedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Tồn kho cập nhật lúc: {new Date(lastSyncedAt).toLocaleString('vi-VN')}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-sm">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Nhóm
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${viewMode === 'flat' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              Danh sách
            </button>
          </div>
          <button onClick={fetchReport} disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button onClick={downloadExcel} disabled={filteredRows.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 dark:disabled:bg-green-900 text-white text-sm font-medium rounded-lg transition-colors">
            ⬇ Tải Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tìm SKU / Tên</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập mã hoặc tên..."
              className={`${inputCls} w-52`} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nhóm hàng</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="">Tất cả</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Mức độ</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value as UrgencyFilter)} className={inputCls}>
              <option value="">Tất cả</option>
              <option value="negative">⚠️ Âm kho</option>
              <option value="urgent">🔴 Cần đặt gấp (&lt; 4 tuần)</option>
              <option value="soon">🟡 Cần đặt sớm (4–8 tuần)</option>
              <option value="low">🟢 Sắp thiếu (8–12 tuần)</option>
              <option value="ok">— Đủ hàng (≥ 12, hiện vì nhóm)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <input type="checkbox" id="rvb-alertOnly" checked={alertOnly} onChange={e => setAlertOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="rvb-alertOnly" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Chỉ SKU cảnh báo
            </label>
          </div>
          {(search || category || urgency || alertOnly) && (
            <button onClick={resetFilters} className="pb-0.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              Reset
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 font-mono">{error}</p>}

      {!loading && allRows.length === 0 && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
          <p className="text-gray-400 text-sm">Không có SKU nào có Weeks Left &lt; 12. Tồn kho ổn định!</p>
        </div>
      )}

      {/* ── GROUPED VIEW ─────────────────────────────────────────────────── */}
      {viewMode === 'grouped' && filteredGroups.length > 0 && (
        <div className="space-y-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Expand/Collapse toolbar */}
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {filteredGroups.length} sản phẩm · {filteredRows.length} SKU
            </span>
            <div className="flex gap-3">
              <button onClick={expandAll} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                Mở tất cả
              </button>
              <button onClick={collapseAll} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">
                Thu tất cả
              </button>
            </div>
          </div>

          {/* Group header row */}
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium w-8"></th>
                <th onClick={() => toggleGSort('name')} className="px-4 py-2.5 text-left font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  Sản phẩm{GSI('name')}
                </th>
                <th onClick={() => toggleGSort('category_name')} className="px-4 py-2.5 text-left font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  Nhóm{GSI('category_name')}
                </th>
                <th onClick={() => toggleGSort('total_avg')} className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  Avg/tuần{GSI('total_avg')}
                </th>
                <th onClick={() => toggleGSort('total_on_hand')} className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  On Hand{GSI('total_on_hand')}
                </th>
                <th onClick={() => toggleGSort('total_on_order')} className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  On Order{GSI('total_on_order')}
                </th>
                <th onClick={() => toggleGSort('total_reserved')} className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  Reserved{GSI('total_reserved')}
                </th>
                <th onClick={() => toggleGSort('group_weeks_left')} className="px-4 py-2.5 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                  Weeks Left{GSI('group_weeks_left')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {filteredGroups.map(g => {
                const isOpen = expandedGroups.has(g.name);
                return (
                  <>
                    {/* Group summary row */}
                    <tr
                      key={`g-${g.name}`}
                      onClick={() => toggleGroup(g.name)}
                      className={`cursor-pointer border-b border-gray-100 dark:border-gray-700 hover:brightness-95 transition-colors ${rowBg(g.group_weeks_left)}`}
                    >
                      <td className="px-4 py-3 text-gray-400 text-center select-none">
                        <span className="inline-block transition-transform duration-150" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {g.name}
                        <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">
                          {g.skus.length} SKU
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{g.category_name ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {Math.round(g.total_avg * 10) / 10}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {g.total_on_hand.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {g.total_on_order.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                        {g.total_reserved.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        <span className={weeksColor(g.group_weeks_left)}>
                          {fmtW(g.group_weeks_left)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {getNote(g.group_weeks_left)}
                      </td>
                    </tr>

                    {/* Expanded SKU rows */}
                    {isOpen && g.skus
                      .slice()
                      .sort((a, b) => (a.weeks_left ?? 999) - (b.weeks_left ?? 999))
                      .map((r, i) => (
                        <tr
                          key={`sku-${r.code}-${i}`}
                          className={`border-b border-gray-100 dark:border-gray-700 ${rowBg(r.weeks_left)} hover:brightness-95 transition-colors`}
                        >
                          <td className="px-4 py-2 text-gray-200 dark:text-gray-700 text-xs text-center">└</td>
                          <td className="px-4 py-2">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-medium text-xs mr-2">{r.code}</span>
                            <span className="text-gray-600 dark:text-gray-400 text-xs">{r.full_name}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-400 text-xs whitespace-nowrap">{r.category_name ?? '—'}</td>
                          <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                            {Math.round(r.avg_weekly_sales * 10) / 10}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-900 dark:text-white text-xs whitespace-nowrap">
                            {r.on_hand.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400 text-xs whitespace-nowrap">
                            {r.on_order.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500 text-xs whitespace-nowrap">
                            {r.reserved.toLocaleString('vi-VN')}
                          </td>
                          <td className="px-4 py-2 text-right text-xs font-semibold whitespace-nowrap">
                            <span className={weeksColor(r.weeks_left)}>{fmtW(r.weeks_left)}</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {getNote(r.weeks_left)}
                          </td>
                        </tr>
                      ))
                    }
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FLAT VIEW ────────────────────────────────────────────────────── */}
      {viewMode === 'flat' && filteredRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th onClick={() => toggleSort('code')} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">Mã SKU{SI('code')}</th>
                <th onClick={() => toggleSort('full_name')} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">Tên sản phẩm{SI('full_name')}</th>
                <th onClick={() => toggleSort('category_name')} className="px-4 py-3 text-left font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">Nhóm{SI('category_name')}</th>
                <th onClick={() => toggleSort('avg_weekly_sales')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">Avg/tuần{SI('avg_weekly_sales')}</th>
                <th onClick={() => toggleSort('on_hand')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">On Hand{SI('on_hand')}</th>
                <th onClick={() => toggleSort('on_order')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">On Order{SI('on_order')}</th>
                <th onClick={() => toggleSort('reserved')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">Reserved{SI('reserved')}</th>
                <th onClick={() => toggleSort('weeks_left')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">Weeks Left{SI('weeks_left')}</th>
                <th className="px-4 py-3 text-left font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredRows.map((r, i) => (
                <tr key={i} className={`${rowBg(r.weeks_left)} hover:brightness-95 transition-colors`}>
                  <td className="px-4 py-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">{r.code}</td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 max-w-xs truncate">{r.full_name}</td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.category_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {Math.round(r.avg_weekly_sales * 10) / 10}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.on_hand.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{r.on_order.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 whitespace-nowrap">{r.reserved.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-2.5 text-right font-semibold whitespace-nowrap">
                    <span className={weeksColor(r.weeks_left)}>
                      {r.weeks_left !== null ? Math.round(r.weeks_left * 10) / 10 : <span className="text-gray-300">N/A</span>}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{getNote(r.weeks_left)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && allRows.length > 0 && filteredRows.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-400 text-sm">Không có kết quả phù hợp với bộ lọc.</p>
        </div>
      )}
    </div>
  );
}
