import type { PayrollRow, Employee, MonthlyInput } from '../types';
import { DEFAULT_CONSTANTS } from '../constants';
import { countWorkingDays } from '../logic/payroll';

type AuditStatus = 'ok' | 'info' | 'warning' | 'error';

interface Props {
  rows: PayrollRow[];
  employees: Employee[];
  input: MonthlyInput;
}

// ── Audit logic ──────────────────────────────────────────────────────────────

const C = DEFAULT_CONSTANTS;
const OT_TARGET = 40;
const BASE_RATIO_WARN = 0.30;   // base < 30% of net income → tax risk
const BASE_RATIO_ERR  = 0.20;   // base < 20% → serious tax risk
const COMM_RATIO_WARN = 0.50;   // commission > 50% of net income → revenue dependency

// Solve for base salary that produces targetHours OT given fixed commission & allowance
// Derivation: base × (target×1.5/Ds/H + 1 − bhxhRate) = tn − a − c
function suggestBase(tn: number, allowance: number, commission: number, targetHours: number, workingDays: number): number {
  const divisor = (targetHours * C.otMultiplier1) / (workingDays * C.workingHoursPerDay) + (1 - C.bhxhRate);
  return Math.max(0, (tn - allowance - commission) / divisor);
}

// Max commission rate at which gap stays ≥ 0
function maxCommissionRate(tn: number, base: number, allowance: number, r: number): number {
  if (r === 0) return 0;
  const budget = tn - base - allowance + base * C.bhxhRate;
  return Math.max(0, budget / r);
}

// Commission rate targeting OT_TARGET hours
function suggestedCommissionRate(tn: number, base: number, allowance: number, r: number, workingDays: number): number {
  if (r === 0) return 0;
  const otHourlyRate = (base / workingDays / C.workingHoursPerDay) * C.otMultiplier1;
  const budget = tn - base - allowance + base * C.bhxhRate;
  return Math.max(0, (budget - OT_TARGET * otHourlyRate) / r);
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

function pct(r: number, decimals = 3): string {
  return (r * 100).toFixed(decimals).replace(/\.?0+$/, '') + '%';
}

function fmtH(h: number): string {
  return h % 1 === 0 ? h.toFixed(0) + 'h' : h.toFixed(1) + 'h';
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Status = AuditStatus;

function Badge({ status, children }: { status: Status; children: React.ReactNode }) {
  const cls = {
    ok:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    error:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }[status];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${cls}`}>{children}</span>;
}

function MetricRow({
  label,
  value,
  status,
  suggestion,
}: {
  label: string;
  value: React.ReactNode;
  status: Status;
  suggestion?: string;
}) {
  const icon = { ok: '✅', info: 'ℹ️', warning: '⚠️', error: '⛔' }[status];
  return (
    <div className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-lg ${
      status === 'error'   ? 'bg-red-50 dark:bg-red-900/10'
      : status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/10'
      : status === 'info'    ? 'bg-blue-50 dark:bg-blue-900/10'
      : 'bg-gray-50 dark:bg-gray-800/50'
    }`}>
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-gray-900 dark:text-gray-100 text-right">{value}</span>
      </div>
      <div className="flex items-start gap-1.5">
        <span className="text-xs mt-0.5">{icon}</span>
        {suggestion
          ? <p className="text-xs text-gray-600 dark:text-gray-400">{suggestion}</p>
          : <p className="text-xs text-gray-400">Hợp lệ</p>}
      </div>
    </div>
  );
}

function EmployeeAuditCard({
  row, emp, r, internalIncome, workingDays,
}: { row: PayrollRow; emp: Employee; r: number; internalIncome: number; workingDays: number }) {
  const tn = row.totalIncome;
  const totalOt = row.otHours1 + row.otHours2 + row.otHours3;

  // ── 0. Gap ──
  const gap = internalIncome - row.baseSalary - row.allowance - row.commission + row.bhxh;
  const gapStatus: Status = gap > 0 ? 'ok' : gap === 0 ? 'info' : 'info';
  const gapSuggestion = gap < 0
    ? `Gap âm (${fmt(Math.round(gap))} đ): nhân sự nghỉ ${row.unpaidLeaveDays.toFixed(2)} ngày không lương, trừ ${fmt(row.deduction)} đ.`
    : gap === 0
    ? `Gap = 0: không có OT, không có nghỉ làm, lương cân bằng chính xác.`
    : undefined;

  // ── 1. OT hours ──
  const otStatus: Status = totalOt > C.otWarningRed ? 'error'
    : totalOt > C.otWarningYellow ? 'warning' : 'ok';

  const optBase40  = suggestBase(tn, row.allowance, row.commission, OT_TARGET, workingDays);
  const optBase72  = suggestBase(tn, row.allowance, row.commission, 72, workingDays);

  const otSuggestion = otStatus === 'error'
    ? `OT vượt giới hạn 72h. Tăng Lương HĐLĐ lên ≥ ${fmt(Math.ceil(optBase72 / 500_000) * 500_000)} để OT về mức hợp pháp, hoặc lên ${fmt(Math.ceil(optBase40 / 500_000) * 500_000)} để OT ~${OT_TARGET}h.`
    : otStatus === 'warning'
    ? `OT cao (${fmtH(totalOt)}). Cân nhắc tăng Lương HĐLĐ lên ~${fmt(Math.ceil(optBase40 / 500_000) * 500_000)} để OT về ~${OT_TARGET}h.`
    : undefined;

  // ── 2. Base salary ratio ──
  const baseRatio = tn > 0 ? row.baseSalary / tn : 0;
  const baseStatus: Status = baseRatio < BASE_RATIO_ERR ? 'error'
    : baseRatio < BASE_RATIO_WARN ? 'warning' : 'ok';

  const minBase30 = tn * BASE_RATIO_WARN;
  const baseSuggestion = baseStatus !== 'ok'
    ? `Lương HĐLĐ chỉ chiếm ${pct(baseRatio, 1)} thu nhập — rủi ro khi cơ quan thuế kiểm tra. Mức tối thiểu khuyến nghị: ${fmt(Math.ceil(minBase30 / 500_000) * 500_000)} (30% TN nội bộ).`
    : undefined;

  // ── 3. Commission ratio (only if has commission) ──
  const commRatio = tn > 0 ? row.commission / tn : 0;
  const commStatus: Status = emp.hasCommission
    ? (commRatio > COMM_RATIO_WARN ? 'warning' : 'ok')
    : 'ok';

  const maxRate  = r > 0 ? maxCommissionRate(tn, row.baseSalary, row.allowance, r) : null;
  const suggRate = r > 0 ? suggestedCommissionRate(tn, row.baseSalary, row.allowance, r, workingDays) : null;

  const commSuggestion = commStatus === 'warning'
    ? `Hoa hồng chiếm ${pct(commRatio, 1)} thu nhập — phụ thuộc cao vào doanh thu. Tỷ lệ gợi ý: ${suggRate !== null ? pct(suggRate) : '—'} (để OT ~${OT_TARGET}h, HH ~${suggRate !== null ? fmt(Math.round(suggRate * r)) : '—'}).`
    : undefined;

  // ── 4. Commission rate (only if has commission & r > 0) ──
  const rateStatus: Status = !emp.hasCommission || r === 0 ? 'ok'
    : maxRate !== null && emp.commissionRate > maxRate ? 'error'
    : commRatio > COMM_RATIO_WARN ? 'warning'
    : 'ok';

  const rateSuggestion = rateStatus === 'error'
    ? `Tỷ lệ hiện tại (${pct(emp.commissionRate)}) vượt mức tối đa (${maxRate !== null ? pct(maxRate) : '—'}) — gap âm, không thể tính OT. Điều chỉnh xuống ≤ ${maxRate !== null ? pct(maxRate) : '—'}.`
    : rateStatus === 'warning'
    ? `Tỷ lệ hiện tại (${pct(emp.commissionRate)}) tạo ra HH cao. Tỷ lệ gợi ý: ${suggRate !== null ? pct(suggRate) : '—'}.`
    : undefined;

  const allStatuses = [otStatus, baseStatus, commStatus, rateStatus, gapStatus];
  const overallStatus: Status = allStatuses.includes('error') ? 'error'
    : allStatuses.includes('warning') ? 'warning'
    : allStatuses.includes('info') ? 'ok'  // info alone = still qualified
    : 'ok';

  const borderCls = overallStatus === 'error'   ? 'border-red-200 dark:border-red-800'
    : overallStatus === 'warning' ? 'border-yellow-200 dark:border-yellow-800'
    : 'border-green-200 dark:border-green-800';

  return (
    <div className={`rounded-xl border ${borderCls} bg-white dark:bg-gray-900 overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${emp.entity === 'Cty' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
          {emp.entity}
        </span>
        <div className="flex-1">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{row.name}</span>
          <span className="ml-2 text-xs text-gray-400">{row.employeeId}</span>
        </div>
        <Badge status={overallStatus}>
          {overallStatus === 'ok' ? 'Hợp lệ' : overallStatus === 'warning' ? 'Cần xem xét' : 'Có vấn đề'}
        </Badge>
        {/* Quick stats */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>TN nội bộ: <strong className="text-gray-800 dark:text-gray-200">{fmt(tn)}</strong></span>
          <span>OT: <strong className={otStatus === 'ok' ? 'text-green-600' : otStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'}>{fmtH(totalOt)}</strong></span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
        <MetricRow
          label="Gap (TN nội bộ − lương cơ bản − phụ cấp − HH + BHXH)"
          value={`${gap >= 0 ? '+' : ''}${fmt(Math.round(gap))} đ`}
          status={gapStatus}
          suggestion={gapSuggestion}
        />
        <MetricRow
          label={`Giờ OT (giới hạn: ${C.otWarningRed}h)`}
          value={`${fmtH(totalOt)} — ${fmt(row.otAmount)} đ`}
          status={otStatus}
          suggestion={otSuggestion}
        />
        <MetricRow
          label={`Lương HĐLĐ / TN nội bộ (≥ 30% khuyến nghị)`}
          value={`${fmt(row.baseSalary)} (${pct(baseRatio, 1)})`}
          status={baseStatus}
          suggestion={baseSuggestion}
        />
        {emp.hasCommission && (
          <>
            <MetricRow
              label={`Hoa hồng / TN nội bộ (≤ 50% khuyến nghị)`}
              value={`${fmt(row.commission)} (${pct(commRatio, 1)})`}
              status={commStatus}
              suggestion={commSuggestion}
            />
            <MetricRow
              label={`Tỷ lệ HH — tối đa / gợi ý`}
              value={maxRate !== null ? `${pct(emp.commissionRate)} → max ${pct(maxRate)}` : '—'}
              status={rateStatus}
              suggestion={rateSuggestion}
            />
          </>
        )}
      </div>

      {/* Suggestion summary box */}
      {overallStatus !== 'ok' && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">💡 Tóm tắt điều chỉnh gợi ý</p>
          <ul className="flex flex-col gap-1">
            {otStatus !== 'ok' && (
              <li>• <strong>Lương HĐLĐ:</strong> {fmt(row.baseSalary)} → ~{fmt(Math.ceil(optBase40 / 500_000) * 500_000)} (OT hiện tại: {fmtH(totalOt)})</li>
            )}
            {baseStatus !== 'ok' && (
              <li>• <strong>Lương HĐLĐ tối thiểu:</strong> ~{fmt(Math.ceil(minBase30 / 500_000) * 500_000)} (30% TN nội bộ)</li>
            )}
            {emp.hasCommission && rateStatus !== 'ok' && maxRate !== null && (
              <li>• <strong>Tỷ lệ HH:</strong> {pct(emp.commissionRate)} → ≤ {pct(maxRate)}</li>
            )}
            {emp.hasCommission && commStatus === 'warning' && suggRate !== null && (
              <li>• <strong>Tỷ lệ HH gợi ý:</strong> ~{pct(suggRate)} (OT ~{OT_TARGET}h)</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AuditingTab({ rows, employees, input }: Props) {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const incomeMap = new Map(input.incomes.map((e) => [e.employeeId, e.amount]));
  const workingDays = countWorkingDays(input.month);

  const enriched = rows.map((row) => {
    const emp = empMap.get(row.employeeId);
    const r = emp ? (emp.entity === 'Cty' ? input.r1 : input.r2) : 0;
    const internalIncome = incomeMap.get(row.employeeId) ?? 0;
    return { row, emp, r, internalIncome };
  }).filter((x): x is { row: PayrollRow; emp: Employee; r: number; internalIncome: number } => x.emp !== undefined);

  const errCount = enriched.filter(({ row, emp, r }) => {
    const totalOt = row.otHours1 + row.otHours2 + row.otHours3;
    const maxR = emp.hasCommission && r > 0 ? maxCommissionRate(row.totalIncome, row.baseSalary, row.allowance, r) : Infinity;
    return totalOt > C.otWarningRed
      || (row.totalIncome > 0 && row.baseSalary / row.totalIncome < BASE_RATIO_ERR)
      || (emp.hasCommission && emp.commissionRate > maxR);
  }).length;

  const warnCount = enriched.filter(({ row, emp, r }) => {
    const totalOt = row.otHours1 + row.otHours2 + row.otHours3;
    const maxR = emp.hasCommission && r > 0 ? maxCommissionRate(row.totalIncome, row.baseSalary, row.allowance, r) : Infinity;
    const baseRatio = row.totalIncome > 0 ? row.baseSalary / row.totalIncome : 1;
    const commRatio = row.totalIncome > 0 ? row.commission / row.totalIncome : 0;
    return (totalOt > C.otWarningYellow && totalOt <= C.otWarningRed)
      || (baseRatio >= BASE_RATIO_ERR && baseRatio < BASE_RATIO_WARN)
      || (emp.hasCommission && commRatio > COMM_RATIO_WARN && emp.commissionRate <= maxR);
  }).length;

  const okCount = enriched.length - errCount - warnCount;

  return (
    <div className="p-4 flex flex-col gap-4 max-w-4xl">
      {/* Summary header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Kiểm tra tính hợp lý — tháng {input.month}</h2>
        <div className="flex items-center gap-2 ml-auto">
          <Badge status="ok">{okCount} hợp lệ</Badge>
          {warnCount > 0 && <Badge status="warning">{warnCount} cần xem xét</Badge>}
          {errCount  > 0 && <Badge status="error">{errCount} có vấn đề</Badge>}
        </div>
      </div>

      {/* Criteria legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
        {[
          { icon: '⏱️', label: 'OT', rule: '≤ 40h tốt / 40–72h cảnh báo / > 72h lỗi' },
          { icon: '🏦', label: 'Lương HĐLĐ', rule: '≥ 30% TN nội bộ (thuế)' },
          { icon: '💰', label: 'Hoa hồng', rule: '≤ 50% TN nội bộ (rủi ro)' },
          { icon: '📊', label: 'Tỷ lệ HH', rule: 'Không vượt ngưỡng tối đa' },
        ].map(({ icon, label, rule }) => (
          <div key={label} className="flex items-start gap-1.5">
            <span>{icon}</span>
            <div><p className="font-medium text-gray-700 dark:text-gray-300">{label}</p><p>{rule}</p></div>
          </div>
        ))}
      </div>

      {/* Employee cards */}
      <div className="flex flex-col gap-3">
        {enriched.map(({ row, emp, r, internalIncome }) => (
          <EmployeeAuditCard key={row.employeeId} row={row} emp={emp} r={r} internalIncome={internalIncome} workingDays={workingDays} />
        ))}
      </div>
    </div>
  );
}
