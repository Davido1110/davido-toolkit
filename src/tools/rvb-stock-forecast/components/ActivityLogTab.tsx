import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabase';

interface LogRow {
  id: number;
  action: string;
  details: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
}

function actionLabel(action: string): string {
  if (action === 'dismiss_products') return '🚫 Bỏ mẫu';
  if (action === 'restore_product')  return '♻️ Khôi phục';
  return action;
}

function actionColor(action: string): string {
  if (action === 'dismiss_products') return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
  if (action === 'restore_product')  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
}

function formatDetails(action: string, details: Record<string, unknown>): string {
  if (action === 'dismiss_products') {
    const names = details.names as string[] | undefined;
    if (names?.length) return names.join(', ');
  }
  if (action === 'restore_product') {
    return (details.name as string) ?? '';
  }
  return JSON.stringify(details);
}

function shortUA(ua: string | null): string {
  if (!ua) return '—';
  if (ua.includes('Chrome'))  return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari'))  return 'Safari';
  if (ua.includes('Edge'))    return 'Edge';
  return ua.slice(0, 40);
}

export default function ActivityLogTab() {
  const db = getSupabase();
  const [rows, setRows]       = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const PAGE = 50;

  useEffect(() => { load(0); }, []);

  async function load(p: number) {
    if (!db) return;
    setLoading(true);
    setError('');
    const { data, error: qErr } = await db
      .from('user_action_logs')
      .select('id, action, details, user_agent, created_at')
      .order('created_at', { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE);

    if (qErr) { setError(qErr.message); setLoading(false); return; }
    const fetched = (data ?? []) as LogRow[];
    setRows(p === 0 ? fetched : prev => [...prev, ...fetched]);
    setHasMore(fetched.length === PAGE + 1);
    if (fetched.length === PAGE + 1) setRows(prev => prev.slice(0, -1));
    setPage(p);
    setLoading(false);
  }

  if (!db) return (
    <div className="text-sm text-amber-600 dark:text-amber-400">
      Chưa kết nối Supabase.
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Activity Log — thao tác dữ liệu
        </h2>
        <button
          onClick={() => load(0)}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">
          Chưa có thao tác nào được ghi lại.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Thời gian</th>
                <th className="px-4 py-2.5 font-medium">Hành động</th>
                <th className="px-4 py-2.5 font-medium">Chi tiết</th>
                <th className="px-4 py-2.5 font-medium">Trình duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono text-xs">
                    {new Date(row.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md ${actionColor(row.action)}`}>
                      {actionLabel(row.action)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                    {formatDetails(row.action, row.details)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                    {shortUA(row.user_agent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => load(page + 1)}
          disabled={loading}
          className="w-full text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
