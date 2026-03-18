import type { PayrollRow, ReconciliationSummary } from '../types';
import { exportReconciliationExcel } from '../utils/excelExport';

interface Props {
  rows: PayrollRow[];
  summary: ReconciliationSummary;
  month: string;
}

/** Money: no rounding, up to 2 decimal places, thousands-separated */
function fmt(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}

/** Hours displayed at 4 dp max; full precision shown on hover */
function fmtHours(n: number, fullPrecision?: number): { display: string; full: string } {
  const full = (fullPrecision ?? n).toLocaleString('vi-VN', { maximumFractionDigits: 10 }).replace(/,?0+$/, '');
  if (n === 0) return { display: '0', full };
  if (Number.isInteger(n)) return { display: n.toString(), full };
  const display = n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  return { display, full };
}

// ─── Shared cell classes ───────────────────────────────────────────────────────

const th  = 'px-3 py-2.5 font-semibold text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap uppercase tracking-wide';
const thR = th + ' text-right';
const td  = 'px-3 py-2.5 text-sm tabular-nums text-gray-800 dark:text-gray-200';
const tdR = td + ' text-right';

// ─── Detail table ──────────────────────────────────────────────────────────────

function DetailView({ rows }: { rows: PayrollRow[] }) {
  const totals = {
    baseSalary:  rows.reduce((s, r) => s + r.baseSalary, 0),
    paidSalary:  rows.reduce((s, r) => s + (r.baseSalary - r.deduction), 0),
    otHours1:    rows.reduce((s, r) => s + r.otHours1, 0),
    otAmount1:   rows.reduce((s, r) => s + r.otHours1 * (r.baseSalary / r.workingDays / 8 * 1.5), 0),
    otHours2:    rows.reduce((s, r) => s + r.otHours2, 0),
    otAmount2:   rows.reduce((s, r) => s + r.otHours2 * (r.baseSalary / r.workingDays / 8 * 2.0), 0),
    otHours3:    rows.reduce((s, r) => s + r.otHours3, 0),
    otAmount3:   rows.reduce((s, r) => s + r.otHours3 * (r.baseSalary / r.workingDays / 8 * 3.0), 0),
    unpaidDays:  rows.reduce((s, r) => s + r.unpaidLeaveDays, 0),
    deduction:   rows.reduce((s, r) => s + r.deduction, 0),
    grossSalary: rows.reduce((s, r) => s + r.grossSalary, 0),
    thuongNong:  rows.reduce((s, r) => s + r.thuongNong, 0),
    commission:  rows.reduce((s, r) => s + r.commission, 0),
    allowance:   rows.reduce((s, r) => s + r.allowance, 0),
    bhxh:        rows.reduce((s, r) => s + r.bhxh, 0),
    totalIncome: rows.reduce((s, r) => s + r.totalIncome, 0),
  };

  const divider = 'border-l border-gray-200 dark:border-gray-700';
  const dividerStrong = 'border-l-2 border-gray-300 dark:border-gray-600';

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Group header row */}
            <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
              <th className={th + ' text-left'} rowSpan={2}>Mã NV</th>
              <th className={th + ' text-left'} rowSpan={2}>Họ tên</th>
              <th className={th + ' text-center'} rowSpan={2}>Pháp nhân</th>
              <th className={thR} rowSpan={2}>Lương HĐLĐ</th>
              <th className={thR} rowSpan={2}>Công chuẩn</th>
              <th className={thR} rowSpan={2}>Số công</th>
              <th className={thR} rowSpan={2}>Tiền công</th>
              {/* OT groups */}
              <th className={th + ` text-center ${dividerStrong} bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400`} colSpan={2}>OT ×1.5</th>
              <th className={th + ` text-center ${divider} bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400`} colSpan={2}>OT ×2</th>
              <th className={th + ` text-center ${divider} bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400`} colSpan={2}>OT ×3</th>
              {/* Unpaid */}
              <th className={th + ` text-center ${dividerStrong} bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400`} colSpan={2}>Nghỉ không lương</th>
              {/* Summary */}
              <th className={thR + ` ${dividerStrong}`} rowSpan={2}>Tổng tiền lương</th>
              <th className={thR + ' text-rose-500 dark:text-rose-400'} rowSpan={2}>Thưởng nóng</th>
              <th className={thR} rowSpan={2}>Hoa hồng</th>
              <th className={thR} rowSpan={2}>Phụ cấp</th>
              <th className={thR + ' text-red-500 dark:text-red-400'} rowSpan={2}>BHXH (−)</th>
              <th className={thR + ' text-green-600 dark:text-green-400'} rowSpan={2}>Tổng TN</th>
              <th rowSpan={2} className="w-8" />
            </tr>
            {/* Sub-header row */}
            <tr className="bg-gray-50 dark:bg-gray-800/80 border-b-2 border-gray-300 dark:border-gray-600 text-xs">
              <th className={thR + ` ${dividerStrong} bg-blue-50 dark:bg-blue-900/20 text-blue-500`}>Giờ</th>
              <th className={thR + ' bg-blue-50 dark:bg-blue-900/20 text-blue-500'}>Tiền</th>
              <th className={thR + ` ${divider} bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500`}>Giờ</th>
              <th className={thR + ' bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500'}>Tiền</th>
              <th className={thR + ` ${divider} bg-violet-50 dark:bg-violet-900/20 text-violet-500`}>Giờ</th>
              <th className={thR + ' bg-violet-50 dark:bg-violet-900/20 text-violet-500'}>Tiền</th>
              <th className={thR + ` ${dividerStrong} bg-orange-50 dark:bg-orange-900/20 text-orange-500`}>Ngày</th>
              <th className={thR + ' bg-orange-50 dark:bg-orange-900/20 text-orange-500'}>Tiền trừ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => {
              const hourlyRate = row.baseSalary / row.workingDays / 8;
              const otAmt1    = row.otHours1 * hourlyRate * 1.5;
              const otAmt2    = row.otHours2 * hourlyRate * 2.0;
              const otAmt3    = row.otHours3 * hourlyRate * 3.0;
              const paidSalary = row.baseSalary - row.deduction;
              const actualDays = row.workingDays - row.unpaidLeaveDays;

              const hasError   = row.warnings.some((w) => w.level === 'error');
              const hasWarning = row.warnings.some((w) => w.level === 'warning');

              const rowBg = hasError
                ? 'bg-red-50/60 dark:bg-red-900/10'
                : hasWarning
                ? 'bg-yellow-50/60 dark:bg-yellow-900/10'
                : idx % 2 === 0
                ? 'bg-white dark:bg-gray-900'
                : 'bg-gray-50/50 dark:bg-gray-800/30';

              const entityBadge = row.entity === 'Cty'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-700'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-700';

              const ot1 = fmtHours(row.otHours1);
              const ot2 = fmtHours(row.otHours2);
              const ot3 = fmtHours(row.otHours3);
              const ud  = fmtHours(row.unpaidLeaveDays);
              const ad  = fmtHours(actualDays);

              return (
                <tr
                  key={row.employeeId}
                  className={`border-b border-gray-100 dark:border-gray-800 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors ${rowBg}`}
                >
                  <td className={td + ' font-mono text-xs text-gray-400 dark:text-gray-500'}>{row.employeeId}</td>
                  <td className={td + ' font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap'}>{row.name}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-md font-semibold ${entityBadge}`}>{row.entity}</span>
                  </td>
                  <td className={tdR + ' text-gray-600 dark:text-gray-400'}>{fmt(row.baseSalary)}</td>
                  <td className={tdR + ' text-gray-400 dark:text-gray-500 text-xs'}>{row.workingDays}</td>
                  <td className={tdR + ' text-gray-500 dark:text-gray-400 text-xs'} title={ad.full}>{ad.display}</td>
                  <td className={tdR + ' font-medium'}>{fmt(paidSalary)}</td>

                  {/* OT ×1.5 */}
                  <td className={tdR + ` ${dividerStrong} text-blue-600 dark:text-blue-400 text-xs`} title={ot1.full}>
                    {row.otHours1 > 0 ? ot1.display : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={tdR + ' text-blue-600 dark:text-blue-400'}>
                    {otAmt1 > 0 ? fmt(otAmt1) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>

                  {/* OT ×2 */}
                  <td className={tdR + ` ${divider} text-indigo-600 dark:text-indigo-400 text-xs`} title={ot2.full}>
                    {row.otHours2 > 0 ? ot2.display : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={tdR + ' text-indigo-600 dark:text-indigo-400'}>
                    {otAmt2 > 0 ? fmt(otAmt2) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>

                  {/* OT ×3 */}
                  <td className={tdR + ` ${divider} text-violet-600 dark:text-violet-400 text-xs`} title={ot3.full}>
                    {row.otHours3 > 0 ? ot3.display : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={tdR + ' text-violet-600 dark:text-violet-400'}>
                    {otAmt3 > 0 ? fmt(otAmt3) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>

                  {/* Unpaid leave */}
                  <td className={tdR + ` ${dividerStrong} text-orange-500 dark:text-orange-400 text-xs`} title={ud.full}>
                    {row.unpaidLeaveDays > 0 ? ud.display : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={tdR + ' text-orange-500 dark:text-orange-400'}>
                    {row.deduction > 0 ? `−${fmt(row.deduction)}` : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>

                  {/* Summary */}
                  <td className={tdR + ` font-semibold ${dividerStrong}`}>{fmt(row.grossSalary)}</td>
                  <td className={tdR + ' text-rose-600 dark:text-rose-400 font-medium'}>
                    {row.thuongNong > 0 ? fmt(row.thuongNong) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={tdR + ' text-emerald-700 dark:text-emerald-400'}>
                    {row.commission > 0 ? fmt(row.commission) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className={tdR + ' text-teal-700 dark:text-teal-400'}>{fmt(row.allowance)}</td>
                  <td className={tdR + ' text-red-500 dark:text-red-400'}>−{fmt(row.bhxh)}</td>
                  <td className={tdR + ' font-bold text-green-700 dark:text-green-400'}>{fmt(row.totalIncome)}</td>

                  {/* Warnings */}
                  <td className="px-2 py-2.5 text-center whitespace-nowrap">
                    {row.warnings.map((w, i) => (
                      <span key={i} title={w.message} className="cursor-help text-sm">
                        {w.level === 'error' ? '⛔' : '⚠️'}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-400 dark:border-gray-500">
              <td colSpan={3} className="px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tổng ({rows.length} NV)
              </td>
              <td className={tdR + ' font-semibold text-gray-700 dark:text-gray-300'}>{fmt(totals.baseSalary)}</td>
              <td /><td />
              <td className={tdR + ' font-semibold'}>{fmt(totals.paidSalary)}</td>
              {/* OT ×1.5 */}
              {(() => {
                const ot1 = fmtHours(totals.otHours1);
                const ot2 = fmtHours(totals.otHours2);
                const ot3 = fmtHours(totals.otHours3);
                const ud  = fmtHours(totals.unpaidDays);
                return (
                  <>
                    <td className={tdR + ` ${dividerStrong} text-blue-600 dark:text-blue-400 text-xs font-semibold`} title={ot1.full}>{totals.otHours1 > 0 ? ot1.display : '—'}</td>
                    <td className={tdR + ' text-blue-600 dark:text-blue-400 font-semibold'}>{totals.otAmount1 > 0 ? fmt(totals.otAmount1) : '—'}</td>
                    <td className={tdR + ` ${divider} text-indigo-600 dark:text-indigo-400 text-xs font-semibold`} title={ot2.full}>{totals.otHours2 > 0 ? ot2.display : '—'}</td>
                    <td className={tdR + ' text-indigo-600 dark:text-indigo-400 font-semibold'}>{totals.otAmount2 > 0 ? fmt(totals.otAmount2) : '—'}</td>
                    <td className={tdR + ` ${divider} text-violet-600 dark:text-violet-400 text-xs font-semibold`} title={ot3.full}>{totals.otHours3 > 0 ? ot3.display : '—'}</td>
                    <td className={tdR + ' text-violet-600 dark:text-violet-400 font-semibold'}>{totals.otAmount3 > 0 ? fmt(totals.otAmount3) : '—'}</td>
                    <td className={tdR + ` ${dividerStrong} text-orange-500 dark:text-orange-400 text-xs font-semibold`} title={ud.full}>{totals.unpaidDays > 0 ? ud.display : '—'}</td>
                    <td className={tdR + ' text-orange-500 dark:text-orange-400 font-semibold'}>{totals.deduction > 0 ? `−${fmt(totals.deduction)}` : '—'}</td>
                  </>
                );
              })()}
              <td className={tdR + ` font-bold ${dividerStrong}`}>{fmt(totals.grossSalary)}</td>
              <td className={tdR + ' font-semibold text-rose-600 dark:text-rose-400'}>{totals.thuongNong > 0 ? fmt(totals.thuongNong) : '—'}</td>
              <td className={tdR + ' font-semibold text-emerald-700 dark:text-emerald-400'}>{totals.commission > 0 ? fmt(totals.commission) : '—'}</td>
              <td className={tdR + ' font-semibold text-teal-700 dark:text-teal-400'}>{fmt(totals.allowance)}</td>
              <td className={tdR + ' font-semibold text-red-500 dark:text-red-400'}>−{fmt(totals.bhxh)}</td>
              <td className={tdR + ' font-bold text-green-700 dark:text-green-400 text-base'}>{fmt(totals.totalIncome)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Main tab ──────────────────────────────────────────────────────────────────

export function PayrollResultTab({ rows, summary, month }: Props) {
  const diff = summary.grandTotal - summary.internalTotal;
  const warnings = rows.flatMap((r) => r.warnings.map((w) => ({ ...w, name: r.name, id: r.employeeId })));
  const errorCount   = warnings.filter((w) => w.level === 'error').length;
  const warningCount = warnings.filter((w) => w.level === 'warning').length;

  return (
    <div className="p-5 flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            Kết quả bảng lương — tháng {month}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {rows.length} nhân viên · Hover vào số giờ OT để xem độ chính xác đầy đủ
          </p>
        </div>
        <div className="flex items-center gap-3">
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
              ⛔ {errorCount} lỗi
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
              ⚠️ {warningCount} cảnh báo
            </span>
          )}
          {errorCount === 0 && warningCount === 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              ✅ Không có cảnh báo
            </span>
          )}
        </div>
      </div>

      <DetailView rows={rows} />

      {/* Reconciliation */}
      <div className={`rounded-xl border-2 p-5 ${summary.matched
        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'}`}
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Đối soát</h3>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
            summary.matched
              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          }`}>
            {summary.matched ? '✅ KHỚP' : '❌ KHÔNG KHỚP'}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Tổng lương Cty', value: fmt(summary.ctyTotal), color: 'text-blue-700 dark:text-blue-300' },
            { label: 'Tổng lương HKD', value: fmt(summary.hkdTotal), color: 'text-purple-700 dark:text-purple-300' },
            { label: 'Tổng TN nội bộ', value: fmt(summary.internalTotal), color: 'text-gray-800 dark:text-gray-200' },
            {
              label: 'Chênh lệch',
              value: `${diff >= 0 ? '+' : ''}${fmt(diff)}`,
              color: Math.abs(diff) < 1 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/60 dark:bg-gray-800/40 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`font-bold tabular-nums text-base ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            exportReconciliationExcel(rows, summary, month).catch((err) => {
              alert('Lỗi xuất file: ' + (err instanceof Error ? err.message : String(err)));
            });
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
        >
          📥 Xuất bảng lương
        </button>
      </div>

      {/* Warnings panel */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 p-4">
          <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-3 text-sm">Cảnh báo &amp; lỗi</h3>
          <ul className="flex flex-col gap-2">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm bg-white/50 dark:bg-gray-800/30 rounded-lg px-3 py-2">
                <span className="mt-0.5 shrink-0">{w.level === 'error' ? '⛔' : '⚠️'}</span>
                <span className="text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-gray-100">{w.name}</strong>
                  <span className="text-gray-400 ml-1">({w.id})</span>
                  {' — '}{w.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
