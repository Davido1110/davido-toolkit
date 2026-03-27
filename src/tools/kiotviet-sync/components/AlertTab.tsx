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

type UrgencyFilter = '' | 'negative' | 'urgent' | 'soon' | 'low' | 'ok';
type SortField = 'code' | 'full_name' | 'category_name' | 'avg_weekly_sales' | 'on_hand' | 'on_order' | 'reserved' | 'weeks_left';
type SortDir   = 'asc' | 'desc';

function getNote(weeksLeft: number | null): string {
  if (weeksLeft === null) return '—';
  if (weeksLeft < 0)  return '⚠️ Âm kho — đặt hàng gấp';
  if (weeksLeft < 4)  return '🔴 Cần đặt hàng gấp (< 4 tuần)';
  if (weeksLeft < 8)  return '🟡 Cần đặt hàng sớm (4–8 tuần)';
  if (weeksLeft < 12) return '🟢 Sắp thiếu hàng (8–12 tuần)';
  return '— (hiển thị do nhóm sản phẩm)';
}

function rowColor(weeksLeft: number | null): string {
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

  // Sort
  const [sortField, setSortField] = useState<SortField>('weeks_left');
  const [sortDir, setSortDir]     = useState<SortDir>('asc');

  useEffect(() => { fetchReport(); }, []);

  async function fetchReport() {
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

    const report = all
      .filter(p => alertNames.has(p.name))
      .sort((a, b) => a.name.localeCompare(b.name) || (a.weeks_left ?? 999) - (b.weeks_left ?? 999));

    const cats = [...new Set(report.map(r => r.category_name).filter(Boolean) as string[])].sort();

    setAlertFamilies(alertNames.size);
    setAllRows(report);
    setCategories(cats);
    setLoading(false);
  }

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = allRows.filter(r => {
      if (alertOnly && (r.weeks_left === null || r.weeks_left >= 12)) return false;
      if (urgency && !matchesUrgency(r.weeks_left, urgency)) return false;
      if (category && r.category_name !== category) return false;
      if (q && !r.code.toLowerCase().includes(q) && !r.full_name.toLowerCase().includes(q)) return false;
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

  function resetFilters() {
    setSearch(''); setCategory(''); setUrgency(''); setAlertOnly(false);
    setSortField('weeks_left'); setSortDir('asc');
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const SI = (f: SortField) => sortField === f ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

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
    XLSX.writeFile(wb, `canh-bao-hang-ton-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

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
        <div className="flex gap-2 shrink-0">
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
            <input type="checkbox" id="alertOnly" checked={alertOnly} onChange={e => setAlertOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="alertOnly" className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Chỉ SKU cảnh báo
            </label>
          </div>
          {(search || category || urgency || alertOnly) && (
            <button onClick={resetFilters}
              className="pb-0.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
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

      {filteredRows.length > 0 && (
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
                <tr key={i} className={`${rowColor(r.weeks_left)} hover:brightness-95 transition-colors`}>
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
                    {r.weeks_left !== null
                      ? <span className={r.weeks_left < 0 ? 'text-orange-600 dark:text-orange-400' : r.weeks_left < 4 ? 'text-red-600 dark:text-red-400' : r.weeks_left < 8 ? 'text-yellow-600 dark:text-yellow-400' : r.weeks_left < 12 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                          {Math.round(r.weeks_left * 10) / 10}
                        </span>
                      : <span className="text-gray-300">N/A</span>
                    }
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
