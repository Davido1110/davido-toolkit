import { useState, useEffect, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import WeekPickerSync from './WeekPickerSync';
import type { SyncLog } from '../lib/types';

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { dot: string; text: string; label: string }> = {
    success: { dot: 'bg-green-500',  text: 'text-green-700 dark:text-green-400',  label: 'Thành công' },
    failed:  { dot: 'bg-red-500',    text: 'text-red-700 dark:text-red-400',      label: 'Thất bại'   },
    partial: { dot: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-400',label: 'Một phần'   },
    running: { dot: 'bg-blue-500',   text: 'text-blue-700 dark:text-blue-400',    label: 'Đang chạy'  },
  };
  const { dot, text, label } = cfg[status] ?? { dot: 'bg-gray-400', text: 'text-gray-600 dark:text-gray-400', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${text}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

function SkeletonCard() {
  return <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 h-20 animate-pulse" />;
}

export default function DashboardTab() {
  const db = getSupabase();
  const [lastLog, setLastLog]     = useState<SyncLog | null>(null);
  const [stats, setStats]         = useState({ skus: 0 });
  const [syncing, setSyncing]     = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [syncMsg, setSyncMsg]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(true);
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
      setSyncMsg(`Sync thành công — ${(data.records_synced ?? 0).toLocaleString('vi-VN')} records, ${data.requests_used} API calls.`);
      await load();
    } catch (e) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setSyncMsg('');
    } finally {
      setSyncing(false);
      setLiveCount(0);
    }
  }

  if (!db) return null;

  return (
    <>
    <style>{`
      @keyframes progress-slide {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      .progress-indeterminate { animation: progress-slide 1.4s ease-in-out infinite; }
    `}</style>
    <div className="space-y-5">

      {/* ── Stat tiles ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* SKU count */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">SKU đang kinh doanh</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.skus.toLocaleString('vi-VN')}</p>
          </div>

          {lastLog ? (
            <>
              {/* Last sync status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Sync gần nhất</p>
                <div className="mt-1.5"><StatusBadge status={lastLog.status} /></div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(lastLog.started_at).toLocaleString('vi-VN')}
                  {lastLog.sync_type && <> · {lastLog.sync_type}</>}
                </p>
              </div>

              {/* Sync result */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kết quả</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {(lastLog.records_synced ?? 0).toLocaleString('vi-VN')}
                  <span className="text-sm font-normal text-gray-400 ml-1">records</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{lastLog.requests_used ?? 0} API calls</p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-400 flex items-center">
              Chưa có sync nào.
            </div>
          )}
        </div>
      )}

      {/* Error from last sync */}
      {!loading && lastLog?.error_message && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl px-4 py-3 text-xs text-red-600 dark:text-red-400 font-mono">
          {lastLog.error_message}
        </div>
      )}

      {/* ── Week picker ── */}
      <WeekPickerSync onSyncDone={load} />

      {/* ── Manual sync ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sync thủ công</p>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={syncType}
              onChange={e => setSyncType(e.target.value as typeof syncType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="products">Sản phẩm &amp; doanh số tuần</option>
              <option value="inventory">Tồn kho — cập nhật nhanh</option>
              <option value="inventory_full">Tồn kho — toàn bộ (lần đầu)</option>
              <option value="branches">Chi nhánh</option>
              <option value="categories">Danh mục sản phẩm</option>
            </select>

            <button
              onClick={triggerSync}
              disabled={syncing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {syncing && (
                <img
                  src="https://cdnb.artstation.com/p/assets/images/images/055/908/871/original/timothe-muller-pika-running.gif?1668011191"
                  alt=""
                  className="h-4 w-auto"
                />
              )}
              {syncing ? 'Đang sync...' : 'Sync ngay'}
            </button>
          </div>

          {syncing && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400">
              {liveCount > 0 ? `${liveCount.toLocaleString('vi-VN')} records...` : 'Đang kết nối...'}
            </p>
          )}
          {syncMsg && <p className="text-sm text-green-600 dark:text-green-400 font-medium">{syncMsg}</p>}
          {error   && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {syncing && (
          <div className="h-0.5 bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
            <div className="progress-indeterminate h-full w-1/4 bg-indigo-500 rounded-full" />
          </div>
        )}
      </div>

    </div>
    </>
  );
}
