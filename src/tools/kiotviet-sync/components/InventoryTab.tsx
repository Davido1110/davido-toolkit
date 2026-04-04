import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import type { Branch } from '../lib/types';

const PAGE = 100;

interface InventoryRow {
  product_id: number;
  branch_id: number;
  product_code: string;
  product_name: string;
  category_name: string | null;
  on_hand: number;
  on_order: number;
  reserved: number;
}

type SortField = 'on_hand' | 'on_order' | 'reserved';
type SortDir   = 'asc' | 'desc';
type StockStatus = '' | 'in_stock' | 'out_of_stock' | 'negative';

export default function InventoryTab() {
  const db = getSupabase();
  const [rows, setRows]         = useState<InventoryRow[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(0);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Filters
  const [search, setSearch]         = useState('');
  const [branchId, setBranchId]     = useState('');
  const [category, setCategory]     = useState('');
  const [stockStatus, setStockStatus] = useState<StockStatus>('');
  const [lowOnly, setLowOnly]       = useState(false);
  const [threshold, setThreshold]   = useState(5);
  const [onHandMin, setOnHandMin]   = useState('');
  const [onHandMax, setOnHandMax]   = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('on_hand');
  const [sortDir, setSortDir]     = useState<SortDir>('asc');

  useEffect(() => {
    db.from('branches').select('*').eq('is_active', true)
      .then(r => setBranches(r.data ?? []));
    db.from('products').select('category_name').not('category_name', 'is', null)
      .then(r => {
        const cats = [...new Set((r.data ?? []).map((p: { category_name: string }) => p.category_name).filter(Boolean))].sort();
        setCategories(cats as string[]);
      });
  }, []);

  useEffect(() => { fetchInventory(); }, [page, sortField, sortDir]);

  async function fetchInventory() {
    setLoading(true);
    setError('');

    // Read from product_inventory_by_branch joined to products for name/category
    let q = db
      .from('product_inventory_by_branch')
      .select('product_id, branch_id, on_hand, on_order, reserved, products!inner(code, name, category_name)', { count: 'exact' })
      .order(sortField, { ascending: sortDir === 'asc' })
      .range(page * PAGE, page * PAGE + PAGE - 1);

    if (branchId)          q = q.eq('branch_id', Number(branchId));
    if (lowOnly)           q = q.lte('on_hand', threshold);
    if (onHandMin !== '')  q = q.gte('on_hand', Number(onHandMin));
    if (onHandMax !== '')  q = q.lte('on_hand', Number(onHandMax));
    if (stockStatus === 'in_stock')     q = q.gt('on_hand', 0);
    if (stockStatus === 'out_of_stock') q = q.eq('on_hand', 0);
    if (stockStatus === 'negative')     q = q.lt('on_hand', 0);
    if (category) q = q.filter('products.category_name', 'eq', category);
    if (search) {
      q = q.or(`name.ilike.%${search}%,code.ilike.%${search}%`, { referencedTable: 'products' });
    }

    const { data, count, error: qErr } = await q;
    if (qErr) { setError(qErr.message); setLoading(false); return; }

    type RawRow = {
      product_id: number; branch_id: number; on_hand: number; on_order: number; reserved: number;
      products: { code: string; name: string; category_name: string | null } | { code: string; name: string; category_name: string | null }[];
    };

    const mapped: InventoryRow[] = (data ?? []).map((r: RawRow) => {
      const prod = Array.isArray(r.products) ? r.products[0] : r.products;
      return {
        product_id: r.product_id, branch_id: r.branch_id,
        product_code: prod.code, product_name: prod.name,
        category_name: prod.category_name,
        on_hand: r.on_hand, on_order: r.on_order, reserved: r.reserved,
      };
    });

    setRows(mapped);
    setTotal(count ?? 0);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    fetchInventory();
  }

  function handleReset() {
    setSearch(''); setBranchId(''); setCategory(''); setStockStatus('');
    setLowOnly(false); setThreshold(5); setOnHandMin(''); setOnHandMax('');
    setSortField('on_hand'); setSortDir('asc');
    setPage(0);
    setTimeout(fetchInventory, 0);
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(0);
  }

  const branchName = (id: number) => branches.find(b => b.branch_id === id)?.branch_name ?? String(id);
  const totalPages = Math.ceil(total / PAGE);
  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const inputCls = 'px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <form onSubmit={handleSearch} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        {/* Row 1 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tìm SKU / Tên</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nhập mã hoặc tên..."
              className={`${inputCls} w-52`} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Chi nhánh</label>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); setPage(0); }} className={inputCls}>
              <option value="">Tất cả</option>
              {branches.map(b => <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nhóm hàng</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              <option value="">Tất cả</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Trạng thái tồn</label>
            <select value={stockStatus} onChange={e => setStockStatus(e.target.value as StockStatus)} className={inputCls}>
              <option value="">Tất cả</option>
              <option value="in_stock">Còn hàng (&gt; 0)</option>
              <option value="out_of_stock">Hết hàng (= 0)</option>
              <option value="negative">Âm kho (&lt; 0)</option>
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tồn kho từ</label>
            <input type="number" value={onHandMin} onChange={e => setOnHandMin(e.target.value)}
              placeholder="Min" className={`${inputCls} w-24`} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">đến</label>
            <input type="number" value={onHandMax} onChange={e => setOnHandMax(e.target.value)}
              placeholder="Max" className={`${inputCls} w-24`} />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <input type="checkbox" id="lowOnly" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="lowOnly" className="text-sm text-gray-700 dark:text-gray-300">Tồn thấp (≤</label>
            <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))}
              min={0} className={`${inputCls} w-16`} />
            <span className="text-sm text-gray-700 dark:text-gray-300">)</span>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sắp xếp</label>
            <select value={`${sortField}_${sortDir}`}
              onChange={e => { const [f, d] = e.target.value.split('_'); setSortField(f as SortField); setSortDir(d as SortDir); setPage(0); }}
              className={inputCls}>
              <option value="on_hand_asc">Tồn kho ↑ (thấp nhất)</option>
              <option value="on_hand_desc">Tồn kho ↓ (cao nhất)</option>
              <option value="on_order_desc">Đặt NCC ↓</option>
              <option value="on_order_asc">Đặt NCC ↑</option>
              <option value="reserved_desc">Khách đặt ↓</option>
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              Lọc
            </button>
            <button type="button" onClick={handleReset}
              className="px-4 py-1.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg transition-colors">
              Reset
            </button>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Đang tải...' : `${total.toLocaleString('vi-VN')} bản ghi`}
        </p>
      </div>
      {error && <p className="text-sm text-red-500 font-mono">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã SKU</th>
              <th className="px-4 py-3 text-left font-medium">Tên sản phẩm</th>
              <th className="px-4 py-3 text-left font-medium">Nhóm</th>
              <th className="px-4 py-3 text-left font-medium">Chi nhánh</th>
              <th onClick={() => toggleSort('on_hand')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                Tồn kho{SortIcon({ field: 'on_hand' })}
              </th>
              <th onClick={() => toggleSort('on_order')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                Đặt NCC{SortIcon({ field: 'on_order' })}
              </th>
              <th onClick={() => toggleSort('reserved')} className="px-4 py-3 text-right font-medium cursor-pointer hover:text-indigo-600 whitespace-nowrap">
                Khách đặt{SortIcon({ field: 'reserved' })}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((r, i) => {
              const isLow = lowOnly && r.on_hand <= threshold;
              const isOut = r.on_hand === 0;
              const isNeg = r.on_hand < 0;
              const rowCls = isNeg
                ? 'bg-orange-50 dark:bg-orange-900/10'
                : isOut
                  ? 'bg-red-50 dark:bg-red-900/10'
                  : isLow
                    ? 'bg-yellow-50 dark:bg-yellow-900/10'
                    : 'bg-white dark:bg-gray-900';
              return (
                <tr key={i} className={`${rowCls} hover:brightness-95 transition-colors`}>
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">{r.product_code}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate">{r.product_name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.category_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{branchName(r.branch_id)}</td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${isNeg ? 'text-orange-600 dark:text-orange-400' : isOut ? 'text-red-500' : isLow ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                    {r.on_hand.toLocaleString('vi-VN')}
                    {isNeg && <span className="ml-1 text-xs">⚠</span>}
                    {isOut && !isNeg && <span className="ml-1 text-xs">✕</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 whitespace-nowrap">{r.on_order.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">{r.reserved.toLocaleString('vi-VN')}</td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Không có dữ liệu tồn kho</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Trang {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300">
              Trước
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300">
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
