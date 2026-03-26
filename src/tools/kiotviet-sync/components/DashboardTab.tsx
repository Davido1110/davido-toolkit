import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import WeekPickerSync from './WeekPickerSync';
import type { SyncLog } from '../lib/types';

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardTab() {
  const db = getSupabase();
  const [lastLog, setLastLog]   = useState<SyncLog | null>(null);
  const [stats, setStats]       = useState({ skus: 0 });
  const [syncing, setSyncing]   = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [syncMsg, setSyncMsg]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  type SyncOption = 'products' | 'inventory' | 'inventory_full' | 'branches' | 'categories';
  const [syncType, setSyncType] = useState<SyncOption>('products');

  async function load() {
    if (!db) return;
    setLoading(true);
    const [logRes, skuRes] = await Promise.all([
      db.from('sync_logs').select('*').order('started_at', { ascending: false }).limit(1).single(),
      db.from('products').select('product_id', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    setLastLog(logRes.data ?? null);
    setStats({ skus: skuRes.count ?? 0 });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function triggerSync() {
    if (!db || syncing) return;
    setSyncing(true);
    setLiveCount(0);
    setSyncMsg('');
    setError('');

    // Poll sync_logs for live records_synced count
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await db!.from('sync_logs')
        .select('records_synced')
        .eq('status', 'running')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setLiveCount(data.records_synced ?? 0);
    }, 1500);

    try {
      const SYNC_MAP: Record<string, Record<string, unknown>> = {
        products:       { sync_type: 'products' },
        inventory:      { sync_type: 'inventory' },
        inventory_full: { sync_type: 'inventory' },
        branches:       { sync_type: 'branches' },
        categories:     { sync_type: 'categories' },
      };
      const body = SYNC_MAP[syncType] ?? { sync_type: 'products' };

      const config = (await import('../lib/supabase')).getEffectiveConfig();
      const res = await fetch(`${config.url}/functions/v1/kiotviet-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);

      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      setSyncMsg(`Sync thành công! ${data.records_synced} records, ${data.requests_used} API requests.`);
      await load();
    } catch (e) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Sync thất bại: ${msg}`);
      setSyncMsg('');
    } finally {
      setSyncing(false);
      setLiveCount(0);
    }
  }

  if (!db) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-5 text-amber-800 dark:text-amber-200 text-sm">
        Chưa kết nối Supabase. Vào tab <strong>Settings</strong> để nhập thông tin kết nối.
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'success') return 'text-green-600 dark:text-green-400';
    if (s === 'failed')  return 'text-red-600 dark:text-red-400';
    if (s === 'partial') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <>
    <style>{`
      @keyframes progress-slide {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      .progress-indeterminate { animation: progress-slide 1.4s ease-in-out infinite; }
    `}</style>
    <div className="space-y-6">
      {/* Stats */}
      {loading ? (
        <div className="text-sm text-gray-400">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
          <StatCard label="SKU đang kinh doanh" value={stats.skus.toLocaleString('vi-VN')} />
        </div>
      )}

      {/* Last sync status */}
      {lastLog && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sync gần nhất</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              Trạng thái: <span className={`font-semibold ${statusColor(lastLog.status)}`}>{lastLog.status}</span>
            </span>
            <span className="text-gray-500">{new Date(lastLog.started_at).toLocaleString('vi-VN')}</span>
            <span className="text-gray-500">{lastLog.records_synced} records</span>
            <span className="text-gray-500">{lastLog.requests_used} API calls</span>
            {lastLog.sync_type && <span className="text-gray-400">({lastLog.sync_type})</span>}
          </div>
          {lastLog.error_message && (
            <p className="mt-2 text-xs text-red-500 font-mono">{lastLog.error_message}</p>
          )}
        </div>
      )}

      {/* Week picker for order backfill */}
      <WeekPickerSync onSyncDone={load} />

      {/* General sync controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-5 space-y-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sync thủ công</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={syncType}
            onChange={e => setSyncType(e.target.value as typeof syncType)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <optgroup label="Sản phẩm">
              <option value="products">Sản phẩm + avg_weekly_sales</option>
            </optgroup>
            <optgroup label="Tồn kho">
              <option value="inventory">Tồn kho — incremental (nhanh)</option>
              <option value="inventory_full">Tồn kho — toàn bộ (lần đầu)</option>
            </optgroup>
            <optgroup label="Khác">
              <option value="branches">Chi nhánh</option>
              <option value="categories">Danh mục sản phẩm</option>
            </optgroup>
          </select>

          <button
            onClick={triggerSync}
            disabled={syncing}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {syncing && (
              <img
                src="https://cdnb.artstation.com/p/assets/images/images/055/908/871/original/timothe-muller-pika-running.gif?1668011191"
                alt="syncing"
                className="h-4 w-auto"
              />
            )}
            {syncing ? 'Đang sync...' : 'Sync ngay'}
          </button>
        </div>

        {syncing && (
          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            {liveCount > 0 ? `Đang sync... ${liveCount.toLocaleString('vi-VN')} records` : 'Đang kết nối...'}
          </p>
        )}
        {syncMsg && <p className="text-sm text-green-600 dark:text-green-400 font-medium">{syncMsg}</p>}
        {error   && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Indeterminate progress bar */}
      {syncing && (
        <div className="h-1 bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
          <div className="progress-indeterminate h-full w-1/4 bg-indigo-500 rounded-full" />
        </div>
      )}
      </div>
    </div>
    </>
  );
}
