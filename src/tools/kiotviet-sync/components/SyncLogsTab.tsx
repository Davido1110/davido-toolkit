import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';
import type { SyncLog } from '../lib/types';

const PAGE = 20;

const STATUS_STYLE: Record<string, string> = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  failed:  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

export default function SyncLogsTab() {
  const db = getSupabase();
  const [logs, setLogs]       = useState<SyncLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => { fetchLogs(); }, [page]);

  async function fetchLogs() {
    if (!db) return;
    setLoading(true);
    const { data, count } = await db
      .from('sync_logs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    setLogs(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }

  if (!db) return (
    <div className="text-sm text-amber-600 dark:text-amber-400">
      Chưa kết nối Supabase. Vào tab Settings để cấu hình.
    </div>
  );

  const totalPages = Math.ceil(total / PAGE);

  function duration(log: SyncLog) {
    if (!log.finished_at) return '—';
    const ms = new Date(log.finished_at).getTime() - new Date(log.started_at).getTime();
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Đang tải...' : `${total} lần sync`}
        </p>
        <button onClick={() => { setPage(0); fetchLogs(); }}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
          Làm mới
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs uppercase">
            <tr>
              {['Thời gian', 'Loại', 'Trạng thái', 'Records', 'API calls', 'Thời lượng', 'Lỗi'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {logs.map(log => (
              <>
                <tr
                  key={log.id}
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                  className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {new Date(log.started_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{log.sync_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[log.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{log.records_synced.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{log.requests_used}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{duration(log)}</td>
                  <td className="px-4 py-3 text-red-500 max-w-xs truncate text-xs">
                    {log.error_message ? '⚠ Xem chi tiết' : '—'}
                  </td>
                </tr>
                {expanded === log.id && log.error_message && (
                  <tr key={`${log.id}-detail`} className="bg-red-50 dark:bg-red-900/10">
                    <td colSpan={7} className="px-4 py-3">
                      <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">
                        {log.error_message}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">Chưa có lịch sử sync</td>
              </tr>
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
