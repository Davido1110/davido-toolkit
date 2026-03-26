import { useState, useEffect, useRef } from 'react';
import { getSupabase, getEffectiveConfig } from '../lib/supabase';

interface Week {
  label: string;
  dateLabel: string;
  from: string;
  to: string;
  orderCount: number | null;
  syncing: boolean;
  liveCount: number;
  error: string;
}

function buildWeeks(): Omit<Week, 'orderCount' | 'syncing' | 'liveCount' | 'error'>[] {
  const now = new Date();
  const dayOfWeek = now.getUTCDay() || 7;
  const startOfCurrentWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  startOfCurrentWeek.setUTCDate(startOfCurrentWeek.getUTCDate() - (dayOfWeek - 1));
  const fmt = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;

  const weeks: Omit<Week, 'orderCount' | 'syncing' | 'liveCount' | 'error'>[] = [];
  for (let i = 1; i <= 12; i++) {
    const monday = new Date(startOfCurrentWeek);
    monday.setUTCDate(monday.getUTCDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    weeks.push({
      label: `Tuần ${weekNo}`,
      dateLabel: `${fmt(monday)}–${fmt(sunday)}`,
      from: monday.toISOString(),
      to: sunday.toISOString(),
    });
  }
  return weeks;
}

export default function WeekPickerSync({ onSyncDone }: { onSyncDone?: () => void }) {
  const db = getSupabase();
  const [weeks, setWeeks] = useState<Week[]>(() =>
    buildWeeks().map(w => ({ ...w, orderCount: null, syncing: false, liveCount: 0, error: '' }))
  );
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevents both fetch-completion and poll-completion from firing at the same time
  const handledRef      = useRef(false);
  // Timestamp when this sync was triggered — used to ignore OLD stuck sync_logs
  const pollStartedAtRef = useRef<number>(0);
  // Staleness detection: if records_synced hasn't changed in 3 min, function was killed
  const lastCountRef    = useRef<{ value: number; at: number }>({ value: -1, at: 0 });

  useEffect(() => {
    if (!db) return;
    (async () => {
      const updated = await Promise.all(
        weeks.map(async (week) => {
          const { count } = await db.from('orders')
            .select('order_id', { count: 'exact', head: true })
            .gte('order_date', week.from)
            .lte('order_date', week.to);
          return { ...week, orderCount: count ?? 0 };
        })
      );
      setWeeks(updated);
    })();
  }, []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  async function finishSuccess(idx: number) {
    if (!db) return;
    const { count } = await db.from('orders')
      .select('order_id', { count: 'exact', head: true })
      .gte('order_date', weeks[idx].from)
      .lte('order_date', weeks[idx].to);
    setWeeks(prev => prev.map((w, i) =>
      i === idx ? { ...w, syncing: false, orderCount: count ?? 0, liveCount: 0 } : w
    ));
    onSyncDone?.();
  }

  function finishError(idx: number, msg: string) {
    setWeeks(prev => prev.map((w, i) =>
      i === idx ? { ...w, syncing: false, liveCount: 0, error: msg } : w
    ));
  }

  // Poll sync_logs for both live progress AND completion.
  // Only tracks sync_logs that were created AFTER this sync was triggered,
  // so old stuck syncs from previous sessions don't interfere.
  function startPolling(idx: number) {
    handledRef.current   = false;
    pollStartedAtRef.current = Date.now();
    lastCountRef.current = { value: -1, at: Date.now() };
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      if (!db || handledRef.current) return;

      // Allow 90s for the Edge Function to boot and create its sync_log
      const cutoff = new Date(pollStartedAtRef.current - 90 * 1000).toISOString();
      const { data } = await db.from('sync_logs')
        .select('records_synced, status, started_at')
        .gte('started_at', cutoff)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      // No new sync_log yet — still waiting for Edge Function to boot
      if (!data || handledRef.current) return;

      if (data.status === 'running') {
        const count = data.records_synced ?? 0;
        if (count !== lastCountRef.current.value) {
          lastCountRef.current = { value: count, at: Date.now() };
        } else if (Date.now() - lastCountRef.current.at > 3 * 60 * 1000) {
          // Count frozen for 3 min → Edge Function was killed without finishing
          handledRef.current = true;
          stopPolling();
          finishError(idx, 'Sync bị gián đoạn (Edge Function timeout). Thử lại.');
          return;
        }
        setWeeks(prev => prev.map((w, i) =>
          i === idx ? { ...w, liveCount: count } : w
        ));
        return;
      }

      // Sync finished
      handledRef.current = true;
      stopPolling();
      if (data.status === 'success') {
        await finishSuccess(idx);
      } else {
        finishError(idx, `Sync ${data.status} — xem sync logs để biết chi tiết`);
      }
    }, 1500);
  }

  async function syncWeek(idx: number) {
    if (weeks[idx].syncing) return;
    setWeeks(prev => prev.map((w, i) =>
      i === idx ? { ...w, syncing: true, liveCount: 0, error: '' } : w
    ));
    startPolling(idx);

    try {
      const config = getEffectiveConfig();
      const res = await fetch(`${config.url}/functions/v1/kiotviet-sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${config.anonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_type: 'orders', from_date: weeks[idx].from, to_date: weeks[idx].to }),
      });

      // HTTP 546 = Supabase gateway timeout — Edge Function is still running in background.
      // Do NOT stop polling. The polling loop above will detect completion via sync_logs.
      if (res.status === 546) return;

      // Fast path: function returned before the gateway timeout
      if (handledRef.current) return; // polling already handled it
      handledRef.current = true;
      stopPolling();

      let data: { ok?: boolean; error?: string } = {};
      try { data = await res.json(); } catch (_) { /* non-JSON body */ }

      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      await finishSuccess(idx);
    } catch (e) {
      if (handledRef.current) return;
      handledRef.current = true;
      stopPolling();
      const msg = e instanceof Error ? e.message : String(e);
      finishError(idx, msg);
    }
  }

  return (
    <>
      <style>{`
        @keyframes progress-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .progress-indeterminate { animation: progress-slide 1.4s ease-in-out infinite; }
      `}</style>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Backfill đơn hàng — 12 tuần gần nhất
        </p>
        <p className="text-xs text-gray-400">
          Sync từng tuần để nạp dữ liệu lần đầu. Sau khi đủ 12 tuần, chạy <strong>Sản phẩm</strong> để cập nhật avg_weekly_sales.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {weeks.map((week, idx) => {
            const hasDone = (week.orderCount ?? 0) > 0;
            return (
              <div
                key={week.from}
                onClick={() => syncWeek(idx)}
                role="button"
                className={`relative overflow-hidden rounded-lg border text-sm cursor-pointer transition-colors select-none ${
                  week.syncing
                    ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700'
                    : hasDone
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/40'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium text-gray-800 dark:text-gray-100">
                    {week.label}
                    <span className="ml-1 font-normal text-gray-500 dark:text-gray-400 text-xs">
                      · {week.dateLabel}
                    </span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs">
                    {week.syncing ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                        <img
                          src="https://cdnb.artstation.com/p/assets/images/images/055/908/871/original/timothe-muller-pika-running.gif?1668011191"
                          alt="syncing"
                          className="h-4 w-auto"
                        />
                        {week.liveCount > 0 ? `${week.liveCount.toLocaleString('vi-VN')} đơn...` : 'đang sync...'}
                      </span>
                    ) : week.orderCount === null ? (
                      <span className="text-gray-300">...</span>
                    ) : hasDone ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ✓ {week.orderCount.toLocaleString('vi-VN')} đơn
                      </span>
                    ) : (
                      <span className="text-gray-400">chưa sync</span>
                    )}
                  </span>
                </div>

                {/* Indeterminate progress bar */}
                {week.syncing && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-100 dark:bg-indigo-900 overflow-hidden">
                    <div className="progress-indeterminate h-full w-1/4 bg-indigo-500 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {weeks.some(w => w.error) && (
          <div className="space-y-1">
            {weeks.filter(w => w.error).map(w => (
              <p key={w.from} className="text-xs text-red-500 font-mono">{w.label}: {w.error}</p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
