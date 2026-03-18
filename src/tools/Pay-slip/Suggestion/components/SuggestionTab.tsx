import { useState } from 'react';
import type { Employee } from '../../types';
import {
  S_MIN,
  ROLE_LABELS,
  PC_BREAKDOWN,
  buildEmployeeSuggestion,
  computeScenarioResult,
} from '../logic/suggestion';
import type {
  SuggestionEmployee,
  SuggestionMonthInput,
  ScenarioKey,
  ScenarioSliders,
  EmployeeRole,
  EmployeeSuggestion,
} from '../logic/suggestion';
import { exportMasterDataExcel, downloadSuggestionTemplate } from '../utils/suggestionExport';
import { parseSuggestionExcel } from '../utils/suggestionImport';

// ── Confirmed entry ────────────────────────────────────────────────────────

interface ConfirmedEntry {
  scenario: ScenarioKey;
  sliders: ScenarioSliders;
}

// ── Slider key types & solve helper (module-level) ─────────────────────────

type SliderKey = 'baseSalary' | 'hhRate' | 'ot1' | 'ot2' | 'ot3';
const SOLVE_PRIORITY: SliderKey[] = ['baseSalary', 'ot1', 'hhRate', 'ot2', 'ot3'];

/**
 * Given sliders (with locked values already applied), solve the first
 * unlocked key to make Delta = 0 for targetTnNb.
 */
function solveFirstUnlocked(
  s: ScenarioSliders,
  locked: Set<SliderKey>,
  targetTnNb: number,
  workingDays: number,
  hasCommission: boolean,
  revenue: number,
  sMin: number,
  sMax: number,
): ScenarioSliders {
  const partner = SOLVE_PRIORITY.find(
    (k) => !locked.has(k) && (k !== 'hhRate' || hasCommission),
  );
  if (!partner) return s;

  const result = { ...s };
  const hourlyRate = workingDays > 0 ? s.baseSalary / (workingDays * 8) : 0;
  const curHH = hasCommission ? s.hhRate * revenue : 0;
  const gap = targetTnNb - s.baseSalary - s.pc - curHH + s.baseSalary * 0.105;

  switch (partner) {
    case 'baseSalary': {
      const weighted = 1.5 * s.ot1 + 2.0 * s.ot2 + 3.0 * s.ot3;
      const denom = 0.895 + (workingDays > 0 ? weighted / (workingDays * 8) : 0);
      if (denom > 0) {
        const hhFS = hasCommission ? s.hhRate * revenue : 0;
        const rawS = (targetTnNb - s.pc - hhFS) / denom;
        result.baseSalary = Math.min(sMax, Math.max(sMin, Math.round(rawS / 100_000) * 100_000));
      }
      break;
    }
    case 'hhRate':
      if (hasCommission && revenue > 0) {
        const otAmt = hourlyRate * (1.5 * s.ot1 + 2.0 * s.ot2 + 3.0 * s.ot3);
        result.hhRate = Math.min(0.01, Math.max(0, (targetTnNb - s.baseSalary * 0.895 - otAmt - s.pc) / revenue));
      }
      break;
    case 'ot1':
      if (hourlyRate > 0) {
        const rem = gap - hourlyRate * (2.0 * s.ot2 + 3.0 * s.ot3);
        result.ot1 = Math.min(100, Math.max(0, rem / (hourlyRate * 1.5)));
      }
      break;
    case 'ot2':
      if (hourlyRate > 0) {
        const rem = gap - hourlyRate * (1.5 * s.ot1 + 3.0 * s.ot3);
        result.ot2 = Math.min(80, Math.max(0, rem / (hourlyRate * 2.0)));
      }
      break;
    case 'ot3':
      if (hourlyRate > 0) {
        const rem = gap - hourlyRate * (1.5 * s.ot1 + 2.0 * s.ot2);
        result.ot3 = Math.min(50, Math.max(0, rem / (hourlyRate * 3.0)));
      }
      break;
  }
  return result;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

function fmtPct(r: number): string {
  return (r * 100).toFixed(2) + '%';
}

function currentMonthDefault(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${mm}/${now.getFullYear()}`;
}

function monthOptions(): string[] {
  const now = new Date();
  const options: string[] = [];
  for (let i = -12; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    options.push(`${mm}/${d.getFullYear()}`);
  }
  return options.reverse();
}

function emptyEmpRow(): SuggestionEmployee {
  return {
    id: String(Date.now() + Math.random()),
    empId: '',
    name: '',
    entity: 'Cty',
    role: 'staff' as EmployeeRole,
    hasCommission: false,
    revenueSource: 'R1',
    tnNbLow: 0,
    tnNbMid: 0,
    tnNbHigh: 0,
  };
}

// ── NumericInput ───────────────────────────────────────────────────────────

interface NumericInputProps {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
}

function NumericInput({ value, onChange, placeholder, className }: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? (value || '') : (value ? value.toLocaleString('vi-VN') : '');
  return (
    <input
      type={focused ? 'number' : 'text'}
      className={className}
      value={displayValue}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

// ── ScenarioPanel ──────────────────────────────────────────────────────────

interface ScenarioPanelProps {
  tnNb: number;
  sliders: ScenarioSliders;
  initialSliders: ScenarioSliders;
  workingDays: number;
  hasCommission: boolean;
  revenue: number;
  role: EmployeeRole;
  locked: Set<SliderKey>;
  onToggleLock: (key: SliderKey) => void;
  onSliderChange: (patch: Partial<ScenarioSliders>) => void;
  onReset: () => void;
}

function ScenarioPanel({
  tnNb,
  sliders,
  initialSliders,
  workingDays,
  hasCommission,
  revenue,
  role,
  locked,
  onToggleLock,
  onSliderChange,
  onReset,
}: ScenarioPanelProps) {
  // Draft state for S text input — only commits on blur/Enter
  const [sDraft, setSDraft] = useState<string | null>(null);

  const result = computeScenarioResult(sliders, tnNb, workingDays, hasCommission, revenue);
  const { bhxh, hh, otAmount, totalIncome, delta, otTotalHours, unpaidLeaveDays, hasLeave } = result;

  const sMin = Math.ceil(Math.max(S_MIN, tnNb * 0.3) / 100_000) * 100_000;
  const sMax = Math.floor(Math.max(sMin + 100_000, tnNb * 0.9) / 100_000) * 100_000;

  const absDelta = Math.abs(delta);
  const deltaColor =
    absDelta === 0
      ? 'text-green-600 dark:text-green-400'
      : absDelta <= 50_000
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400';
  const deltaIcon = absDelta === 0 ? '✅' : absDelta <= 50_000 ? '⚠' : '🛑';

  const otColor =
    otTotalHours > 72
      ? 'text-red-600 dark:text-red-400'
      : otTotalHours > 40
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-gray-900 dark:text-gray-100';
  const otIcon = otTotalHours > 72 ? ' 🛑' : otTotalHours > 40 ? ' ⚠' : '';

  const inputCls = 'w-full h-2 rounded-full cursor-pointer accent-blue-600';
  const labelCls = 'text-xs font-semibold text-gray-700 dark:text-gray-300';
  const valueCls = 'text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums';

  // ── Generic auto-solve ────────────────────────────────────────────────────

  function autoSolve(changedKey: SliderKey, changedVal: number): Partial<ScenarioSliders> {
    const patch: Partial<ScenarioSliders> = { [changedKey]: changedVal };

    // Find first unlocked partner (excluding changedKey; exclude hhRate if no commission)
    const partner = SOLVE_PRIORITY.find(
      (k) => k !== changedKey && !locked.has(k) && (k !== 'hhRate' || hasCommission),
    );
    if (!partner) return patch;

    // Hypothetical sliders after applying changedKey
    const h = { ...sliders, [changedKey]: changedVal };
    const curHH = hasCommission ? h.hhRate * revenue : 0;
    const hourlyRate = workingDays > 0 ? h.baseSalary / (workingDays * 8) : 0;
    const gap = tnNb - h.baseSalary - h.pc - curHH + h.baseSalary * 0.105;

    switch (partner) {
      case 'baseSalary': {
        const weighted = 1.5 * h.ot1 + 2.0 * h.ot2 + 3.0 * h.ot3;
        const denom = 0.895 + (workingDays > 0 ? weighted / (workingDays * 8) : 0);
        if (denom <= 0) break;
        const hhForSolve = hasCommission ? h.hhRate * revenue : 0;
        const rawS = (tnNb - h.pc - hhForSolve) / denom;
        patch.baseSalary = Math.min(sMax, Math.max(sMin, Math.round(rawS / 100_000) * 100_000));
        break;
      }
      case 'hhRate': {
        if (!hasCommission || revenue <= 0) break;
        const otAmt = hourlyRate * (1.5 * h.ot1 + 2.0 * h.ot2 + 3.0 * h.ot3);
        patch.hhRate = Math.min(0.01, Math.max(0, (tnNb - h.baseSalary * 0.895 - otAmt - h.pc) / revenue));
        break;
      }
      case 'ot1': {
        if (hourlyRate <= 0) break;
        const rem = gap - hourlyRate * (2.0 * h.ot2 + 3.0 * h.ot3);
        patch.ot1 = Math.min(100, Math.max(0, rem / (hourlyRate * 1.5)));
        break;
      }
      case 'ot2': {
        if (hourlyRate <= 0) break;
        const rem = gap - hourlyRate * (1.5 * h.ot1 + 3.0 * h.ot3);
        patch.ot2 = Math.min(80, Math.max(0, rem / (hourlyRate * 2.0)));
        break;
      }
      case 'ot3': {
        if (hourlyRate <= 0) break;
        const rem = gap - hourlyRate * (1.5 * h.ot1 + 2.0 * h.ot2);
        patch.ot3 = Math.min(50, Math.max(0, rem / (hourlyRate * 3.0)));
        break;
      }
    }
    return patch;
  }

  // ── Lock button ───────────────────────────────────────────────────────────
  function LockBtn({ sliderKey }: { sliderKey: SliderKey }) {
    const isLocked = locked.has(sliderKey);
    return (
      <button
        onClick={() => onToggleLock(sliderKey)}
        title={isLocked ? 'Bỏ khóa' : 'Khóa slider này'}
        className={`ml-1.5 text-xs px-1.5 py-0.5 rounded transition-colors ${
          isLocked
            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 font-bold'
            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
      >
        {isLocked ? '🔒' : '🔓'}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* S slider */}
      <div className={`flex flex-col gap-1 ${locked.has('baseSalary') ? 'opacity-50' : ''}`}>
        <div className="flex justify-between items-center">
          <span className="flex items-center">
            <span className={labelCls}>Lương HĐLĐ (S)</span>
            <LockBtn sliderKey="baseSalary" />
          </span>
          <input
            type="text"
            className="text-right text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100 w-36 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none transition-colors"
            value={sDraft !== null ? sDraft : sliders.baseSalary.toLocaleString('vi-VN')}
            onFocus={() => setSDraft(String(sliders.baseSalary))}
            onChange={(e) => setSDraft(e.target.value)}
            onBlur={() => {
              if (sDraft !== null) {
                const raw = Number(sDraft.replace(/[^0-9]/g, ''));
                const clamped = Math.min(sMax, Math.max(sMin, Math.round(raw / 100_000) * 100_000));
                onSliderChange(autoSolve('baseSalary', clamped));
                setSDraft(null);
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        </div>
        <input
          type="range"
          className={inputCls}
          min={sMin}
          max={sMax}
          step={100_000}
          value={sliders.baseSalary}
          onChange={(e) => onSliderChange(autoSolve('baseSalary', Number(e.target.value)))}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>BHXH: <span className="text-red-600 dark:text-red-400 font-medium">−{fmt(bhxh)}</span></span>
          <span className="tabular-nums">{fmt(sMin)} → {fmt(sMax)}</span>
        </div>
      </div>

      {/* PC — auto-set by role, read-only with breakdown tooltip */}
      <div className="flex flex-col gap-1.5">
        <span className={labelCls}>Phụ cấp (PC)</span>
        <div className="relative group">
          <div className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center cursor-default select-none">
            <span>{fmt(sliders.pc)}</span>
            <span className="text-xs font-normal text-gray-400 dark:text-gray-500">đ · theo chức vụ ℹ</span>
          </div>
          {/* Tooltip */}
          <div className="absolute left-0 bottom-full mb-2 z-20 hidden group-hover:block w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl text-xs overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300">
              Chi tiết phụ cấp — {ROLE_LABELS[role]}
            </div>
            {PC_BREAKDOWN[role].map(({ label, amount }) => (
              <div key={label} className="flex justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-gray-600 dark:text-gray-400">{label}</span>
                <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{fmt(amount)}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-100 dark:border-blue-800 font-semibold">
              <span className="text-blue-700 dark:text-blue-300">Tổng</span>
              <span className="tabular-nums text-blue-700 dark:text-blue-300">{fmt(sliders.pc)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* HH% slider — only if hasCommission */}
      {hasCommission && (
        <div className={`flex flex-col gap-1 ${locked.has('hhRate') ? 'opacity-50' : ''}`}>
          <div className="flex justify-between items-center">
            <span className="flex items-center">
              <span className={labelCls}>Tỷ lệ HH</span>
              <LockBtn sliderKey="hhRate" />
            </span>
            <span className={valueCls}>{fmtPct(sliders.hhRate)} → {fmt(hh)}</span>
          </div>
          <input
            type="range"
            className={inputCls}
            min={0}
            max={0.01}
            step={0.0001}
            value={sliders.hhRate}
            onChange={(e) => onSliderChange(autoSolve('hhRate', Number(e.target.value)))}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0%</span>
            <span>1%</span>
          </div>
        </div>
      )}

      {/* OT sliders */}
      <div className="flex flex-col gap-2">
        {[
          { key: 'ot1' as const, label: 'OT thường (1.5×)', max: 100 },
          { key: 'ot2' as const, label: 'OT cuối tuần (2.0×)', max: 80 },
          { key: 'ot3' as const, label: 'OT lễ/tết (3.0×)', max: 50 },
        ].map(({ key, label, max }) => (
          <div key={key} className={`flex flex-col gap-1 ${locked.has(key) ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                <LockBtn sliderKey={key} />
              </span>
              <span className={`text-xs font-semibold tabular-nums ${key === 'ot1' ? otColor : 'text-gray-900 dark:text-gray-100'}`}>
                {sliders[key]}h
              </span>
            </div>
            <input
              type="range"
              className={inputCls}
              min={0}
              max={max}
              step={1}
              value={sliders[key]}
              onChange={(e) => onSliderChange(autoSolve(key, Number(e.target.value)))}
            />
          </div>
        ))}
        {otTotalHours > 0 && (
          <div className={`text-xs font-medium tabular-nums ${otColor}`}>
            Tổng OT: {otTotalHours}h{otIcon} · Tiền OT: {fmt(otAmount)}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Leave warning */}
      {hasLeave && (
        <div className="text-xs text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
          Nghỉ không lương: {unpaidLeaveDays.toFixed(2)} ngày
        </div>
      )}

      {/* Result panel */}
      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
        {[
          { label: 'Lương HĐLĐ (S)', value: sliders.baseSalary },
          { label: 'Phụ cấp (PC)', value: sliders.pc },
          ...(hasCommission ? [{ label: 'Hoa hồng (HH)', value: hh }] : []),
          { label: 'BHXH (−)', value: -bhxh, neg: true },
          { label: 'Tiền OT', value: otAmount },
        ].map(({ label, value, neg }) => (
          <div key={label} className="flex justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
            <span className={`font-medium tabular-nums ${neg ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {neg ? '−' : ''}{fmt(Math.abs(value))}
            </span>
          </div>
        ))}
        <div className="flex justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700/40 border-t border-gray-200 dark:border-gray-600 font-semibold">
          <span className="text-gray-700 dark:text-gray-300">Tổng TN</span>
          <span className="tabular-nums text-gray-900 dark:text-gray-100">{fmt(totalIncome)}</span>
        </div>
        <div className="flex justify-between px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">TN_NB mục tiêu</span>
          <span className="tabular-nums font-medium text-gray-700 dark:text-gray-300">{fmt(tnNb)}</span>
        </div>
        <div className="flex justify-between items-center px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Delta</span>
          <span className={`tabular-nums font-bold ${deltaColor}`}>
            {delta > 0 ? '+' : ''}{fmt(delta)} {deltaIcon}
          </span>
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="w-full text-xs py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        ↺ Khôi phục gợi ý ban đầu
      </button>

      {/* Unused initialSliders reference to satisfy TS */}
      <span className="hidden">{JSON.stringify(initialSliders).length}</span>
    </div>
  );
}

// ── EmployeeCard ───────────────────────────────────────────────────────────

interface EmployeeCardProps {
  suggestion: EmployeeSuggestion;
  sliders: Record<ScenarioKey, ScenarioSliders>;
  confirmedEntry?: ConfirmedEntry;
  onSliderChange: (scenario: ScenarioKey, patch: Partial<ScenarioSliders>) => void;
  onReset: (scenario: ScenarioKey) => void;
  onConfirm: (scenario: ScenarioKey, sliders: ScenarioSliders) => void;
  onUnconfirm: () => void;
}

function EmployeeCard({ suggestion, sliders, confirmedEntry, onSliderChange, onReset, onConfirm, onUnconfirm }: EmployeeCardProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('mid');
  const [locked, setLocked] = useState<Set<SliderKey>>(new Set());
  const { employee, workingDays, revenue } = suggestion;

  const SCENARIO_LABELS: Record<ScenarioKey, string> = {
    low: 'Thấp',
    mid: 'Trung bình',
    high: 'Cao',
  };

  function toggleLock(key: SliderKey) {
    setLocked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleScenarioChange(newScenario: ScenarioKey) {
    if (newScenario === activeScenario) return;

    if (locked.size > 0) {
      const currentSliders = sliders[activeScenario];
      const newTnNb = suggestion[newScenario].tnNb;
      const newSMin = Math.ceil(Math.max(S_MIN, newTnNb * 0.3) / 100_000) * 100_000;
      const newSMax = Math.floor(Math.max(newSMin + 100_000, newTnNb * 0.9) / 100_000) * 100_000;

      // Start from the new scenario's initial sliders, then override locked keys
      let newSliders: ScenarioSliders = { ...suggestion[newScenario].initialSliders };
      for (const key of locked) {
        (newSliders as unknown as Record<string, number>)[key] = (currentSliders as unknown as Record<string, number>)[key];
      }

      // Re-solve first unlocked key to restore Delta = 0
      newSliders = solveFirstUnlocked(
        newSliders, locked, newTnNb, workingDays,
        employee.hasCommission, revenue, newSMin, newSMax,
      );
      onSliderChange(newScenario, newSliders);
    }

    setActiveScenario(newScenario);
  }

  const activeData = suggestion[activeScenario];

  const SCENARIO_LABELS_SHORT: Record<ScenarioKey, string> = { low: 'Thấp', mid: 'Trung bình', high: 'Cao' };

  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-900 overflow-hidden transition-colors ${
      confirmedEntry
        ? 'border-green-400 dark:border-green-600'
        : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center gap-3 flex-wrap ${
        confirmedEntry
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {employee.name || <span className="text-gray-400 italic">Chưa đặt tên</span>}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
          employee.entity === 'Cty'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
        }`}>
          {employee.entity}
        </span>
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium">
          {workingDays} ngày công
        </span>
        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
          {ROLE_LABELS[employee.role]}
        </span>
        {employee.hasCommission && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 font-medium">
            HH ({employee.revenueSource}) · DT {fmt(revenue)}
          </span>
        )}
        {/* Confirmed badge */}
        {confirmedEntry && (
          <span className="ml-auto flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs rounded-full bg-green-500 text-white font-semibold flex items-center gap-1">
              ✓ Đã xác nhận · {SCENARIO_LABELS_SHORT[confirmedEntry.scenario]}
            </span>
            <button
              onClick={onUnconfirm}
              className="text-xs px-2.5 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Sửa lại
            </button>
          </span>
        )}
      </div>

      {/* Scenario tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['low', 'mid', 'high'] as ScenarioKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handleScenarioChange(key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeScenario === key
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {SCENARIO_LABELS[key]}
            <span className="ml-1.5 text-xs font-normal tabular-nums opacity-70">
              {fmt(activeData.tnNb === suggestion[key].tnNb ? suggestion[key].tnNb : suggestion[key].tnNb)}
            </span>
          </button>
        ))}
      </div>

      {/* Active scenario panel */}
      <div className="p-4 flex flex-col gap-3">
        <ScenarioPanel
          tnNb={activeData.tnNb}
          sliders={sliders[activeScenario]}
          initialSliders={activeData.initialSliders}
          workingDays={workingDays}
          hasCommission={employee.hasCommission}
          revenue={revenue}
          role={employee.role}
          locked={locked}
          onToggleLock={toggleLock}
          onSliderChange={(patch) => onSliderChange(activeScenario, patch)}
          onReset={() => onReset(activeScenario)}
        />

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(activeScenario, sliders[activeScenario])}
          className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            confirmedEntry
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
          }`}
        >
          {confirmedEntry ? '✓ Cập nhật xác nhận cho kịch bản này' : '✓ Xác nhận bộ số này'}
        </button>
      </div>
    </div>
  );
}

// ── SummaryTable ───────────────────────────────────────────────────────────

interface SummaryTableProps {
  suggestions: EmployeeSuggestion[];
  sliderState: Map<string, Record<ScenarioKey, ScenarioSliders>>;
  confirmed: Map<string, ConfirmedEntry>;
}

function SummaryTable({ suggestions, confirmed }: SummaryTableProps) {
  const dash = <span className="text-gray-300 dark:text-gray-600">—</span>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <th className="text-left px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Mã NV</th>
            <th className="text-left px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Họ tên</th>
            <th className="text-center px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Pháp nhân</th>
            <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Lương HĐLĐ</th>
            <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Phụ cấp</th>
            <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Hoa hồng</th>
            <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">TN nội bộ</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((sug) => {
            const entry = confirmed.get(sug.employee.id);
            const sl = entry?.sliders;
            return (
              <tr key={sug.employee.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">
                  {sug.employee.empId || dash}
                </td>
                <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {entry && <span className="text-green-500 leading-none">✓</span>}
                    <span className={entry ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-gray-100'}>
                      {sug.employee.name || dash}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center whitespace-nowrap">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    sug.employee.entity === 'Cty'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                  }`}>
                    {sug.employee.entity}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-gray-800 dark:text-gray-200">
                  {sl ? fmt(sl.baseSalary) : dash}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-gray-800 dark:text-gray-200">
                  {sl ? fmt(sl.pc) : dash}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                  {sl
                    ? <span className={sug.employee.hasCommission && sl.hhRate > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400'}>
                        {sug.employee.hasCommission ? fmtPct(sl.hhRate) : '—'}
                      </span>
                    : dash}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap text-gray-400">
                  {dash}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────

interface Props {
  employees: Employee[];
}

type InnerTab = 'input' | 'suggestion' | 'summary';

export function SuggestionTab({ employees }: Props) {
  const month = currentMonthDefault();
  const [monthInput, setMonthInput] = useState<SuggestionMonthInput>({ month, r1: 10_000_000_000, r2: 5_000_000_000 });
  const [empRows, setEmpRows] = useState<SuggestionEmployee[]>([emptyEmpRow()]);
  const [innerTab, setInnerTab] = useState<InnerTab>('input');
  const [suggestions, setSuggestions] = useState<EmployeeSuggestion[] | null>(null);
  const [sliderState, setSliderState] = useState<Map<string, Record<ScenarioKey, ScenarioSliders>>>(new Map());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showEmployeePicker, setShowEmployeePicker] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Confirmed state ────────────────────────────────────────────────────────
  const [confirmed, setConfirmed] = useState<Map<string, ConfirmedEntry>>(new Map());

  function handleConfirm(empId: string, scenario: ScenarioKey, sliders: ScenarioSliders) {
    setConfirmed((prev) => new Map(prev).set(empId, { scenario, sliders }));
  }

  function handleUnconfirm(empId: string) {
    setConfirmed((prev) => {
      const next = new Map(prev);
      next.delete(empId);
      return next;
    });
  }

  // ── Suggestion tab filters ─────────────────────────────────────────────────
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterSalaryMin, setFilterSalaryMin] = useState<number>(0);
  const [filterSalaryMax, setFilterSalaryMax] = useState<number>(0);
  const [quickFilter, setQuickFilter] = useState<'unconfirmed' | 'ot-high' | ''>('');

  const months = monthOptions();

  const inputCls =
    'px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

  const cellInputCls =
    'w-full px-2 py-1 text-sm text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';

  // ── Row management ────────────────────────────────────────────────────────

  function updateRow(id: string, patch: Partial<SuggestionEmployee>) {
    setEmpRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const merged = { ...r, ...patch };
      // Auto-derive revenueSource from entity
      merged.revenueSource = merged.entity === 'Cty' ? 'R1' : 'R2';
      return merged;
    }));
  }

  function addRow() {
    setEmpRows((prev) => [...prev, emptyEmpRow()]);
  }

  function deleteRow(id: string) {
    setEmpRows((prev) => prev.filter((r) => r.id !== id));
  }

  function selectEmployeeFromDS(rowId: string, emp: Employee) {
    updateRow(rowId, {
      empId: emp.id,
      name: emp.name,
      entity: emp.entity,
      hasCommission: emp.hasCommission,
      revenueSource: emp.entity === 'Cty' ? 'R1' : 'R2',
    });
    setShowEmployeePicker(null);
  }

  // ── Slider management ──────────────────────────────────────────────────────

  function updateSlider(empId: string, scenario: ScenarioKey, patch: Partial<ScenarioSliders>) {
    setSliderState((prev) => {
      const next = new Map(prev);
      const existing = next.get(empId)!;
      next.set(empId, {
        ...existing,
        [scenario]: { ...existing[scenario], ...patch },
      });
      return next;
    });
  }

  function resetSlider(empId: string, scenario: ScenarioKey) {
    if (!suggestions) return;
    const sug = suggestions.find((s) => s.employee.id === empId);
    if (!sug) return;
    setSliderState((prev) => {
      const next = new Map(prev);
      const existing = next.get(empId)!;
      next.set(empId, {
        ...existing,
        [scenario]: { ...sug[scenario].initialSliders },
      });
      return next;
    });
  }

  // ── Excel import ──────────────────────────────────────────────────────────

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-uploaded
    setImportError(null);
    setImporting(true);
    try {
      const parsed = await parseSuggestionExcel(file);
      if (parsed.length === 0) {
        setImportError('Không tìm thấy dữ liệu hợp lệ. Kiểm tra file có đúng template không.');
        return;
      }
      setEmpRows(parsed);
      setValidationErrors({});
      // Auto-calculate immediately after import
      const built = parsed.map((emp) => buildEmployeeSuggestion(emp, monthInput));
      setSuggestions(built);
      const initMap = new Map<string, Record<ScenarioKey, ScenarioSliders>>();
      for (const sug of built) {
        initMap.set(sug.employee.id, {
          low:  { ...sug.low.initialSliders },
          mid:  { ...sug.mid.initialSliders },
          high: { ...sug.high.initialSliders },
        });
      }
      setSliderState(initMap);
      setInnerTab('suggestion');
    } catch {
      setImportError('Lỗi đọc file. Đảm bảo file đúng định dạng .xlsx.');
    } finally {
      setImporting(false);
    }
  }

  // ── Calculate ─────────────────────────────────────────────────────────────

  function handleCalculate() {
    // Validate ordering
    const errors: Record<string, string> = {};
    for (const row of empRows) {
      if (row.tnNbLow > row.tnNbMid) {
        errors[row.id] = 'TN_NB Thấp phải ≤ Trung bình';
      } else if (row.tnNbMid > row.tnNbHigh) {
        errors[row.id] = 'TN_NB Trung bình phải ≤ Cao';
      }
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const built = empRows.map((emp) => buildEmployeeSuggestion(emp, monthInput));
    setSuggestions(built);

    // Initialize slider state from initial sliders
    const initMap = new Map<string, Record<ScenarioKey, ScenarioSliders>>();
    for (const sug of built) {
      initMap.set(sug.employee.id, {
        low:  { ...sug.low.initialSliders },
        mid:  { ...sug.mid.initialSliders },
        high: { ...sug.high.initialSliders },
      });
    }
    setSliderState(initMap);
    setInnerTab('suggestion');
  }

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    if (!suggestions) return;
    const confirmedSuggestions = suggestions.filter((s) => confirmed.has(s.employee.id));
    if (confirmedSuggestions.length === 0) return;
    // Build a slider state that uses the confirmed sliders for each employee
    const confirmedSliderState = new Map<string, Record<ScenarioKey, ScenarioSliders>>();
    for (const sug of confirmedSuggestions) {
      const entry = confirmed.get(sug.employee.id)!;
      confirmedSliderState.set(sug.employee.id, {
        low: entry.sliders, mid: entry.sliders, high: entry.sliders,
      });
    }
    exportMasterDataExcel(confirmedSuggestions, confirmedSliderState, monthInput.month);
  }

  // ── Inner tab bar ──────────────────────────────────────────────────────────

  const INNER_TABS: { key: InnerTab; label: string }[] = [
    { key: 'input', label: 'Nhập liệu' },
    { key: 'suggestion', label: 'Gợi ý & Điều chỉnh' },
    { key: 'summary', label: 'Tổng hợp' },
  ];

  return (
    <div className="p-4 flex flex-col gap-5 max-w-5xl">

      {/* Inner tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {INNER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              if (key !== 'input' && !suggestions) return;
              setInnerTab(key);
            }}
            disabled={key !== 'input' && !suggestions}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              innerTab === key
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── INPUT TAB ──────────────────────────────────────────────────────── */}
      {innerTab === 'input' && (
        <>
          {/* Month + Revenue */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Tháng tham chiếu
              </label>
              <select
                className={inputCls}
                value={monthInput.month}
                onChange={(e) => setMonthInput((prev) => ({ ...prev, month: e.target.value }))}
              >
                {months.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Doanh thu Cty (R1)
              </label>
              <NumericInput
                className={inputCls}
                value={monthInput.r1}
                onChange={(v) => setMonthInput((prev) => ({ ...prev, r1: v }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Doanh thu HKD (R2)
              </label>
              <NumericInput
                className={inputCls}
                value={monthInput.r2}
                onChange={(v) => setMonthInput((prev) => ({ ...prev, r2: v }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Employee input table */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200">Nhập nhân viên & TN_NB mục tiêu</h3>
              <div className="flex items-center gap-2">
                {/* Template download */}
                <button
                  onClick={downloadSuggestionTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  📄 Tải template
                </button>
                {/* Excel upload */}
                <label className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors ${
                  importing
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}>
                  {importing ? '⏳ Đang xử lý...' : '📥 Upload Excel'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    disabled={importing}
                    onChange={handleImport}
                  />
                </label>
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Thêm nhân viên
                </button>
              </div>
            </div>

            {/* Import error */}
            {importError && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {importError}
              </div>
            )}

            {/* Import hint */}
            <div className="text-xs text-gray-500 dark:text-gray-500 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg px-3 py-2">
              Tải template → điền danh sách nhân viên → Upload Excel → hệ thống gợi ý ngay cho tất cả.
              <br />
              Cột: <span className="font-medium">Mã NV · Họ tên · Pháp nhân · Chức vụ · Có HH · TN_NB Thấp · TN_NB Trung bình · TN_NB Cao</span>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Tên NV</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Pháp nhân</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Chức vụ</th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">Có HH</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">TN_NB Thấp</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">TN_NB Trung bình</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">TN_NB Cao</th>
                      <th className="px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {empRows.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                        {/* Name + DS picker */}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 relative">
                            <input
                              type="text"
                              className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Tên nhân viên"
                              value={row.name}
                              onChange={(e) => updateRow(row.id, { name: e.target.value })}
                            />
                            {employees.length > 0 && (
                              <div className="relative">
                                <button
                                  className="px-2 py-1 text-xs border border-blue-400 text-blue-600 dark:border-blue-500 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                  onClick={() => setShowEmployeePicker(showEmployeePicker === row.id ? null : row.id)}
                                >
                                  DS
                                </button>
                                {showEmployeePicker === row.id && (
                                  <div className="absolute left-0 top-full mt-1 z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[220px] max-h-48 overflow-y-auto">
                                    {employees.map((emp) => (
                                      <button
                                        key={emp.id}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
                                        onClick={() => selectEmployeeFromDS(row.id, emp)}
                                      >
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{emp.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{emp.id} · {emp.entity}</div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {validationErrors[row.id] && (
                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">{validationErrors[row.id]}</div>
                          )}
                        </td>

                        {/* Entity */}
                        <td className="px-3 py-2">
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.entity}
                            onChange={(e) => updateRow(row.id, { entity: e.target.value as 'Cty' | 'HKD' })}
                          >
                            <option value="Cty">Cty</option>
                            <option value="HKD">HKD</option>
                          </select>
                        </td>

                        {/* Role */}
                        <td className="px-3 py-2">
                          <select
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={row.role}
                            onChange={(e) => updateRow(row.id, { role: e.target.value as EmployeeRole })}
                          >
                            {(Object.keys(ROLE_LABELS) as EmployeeRole[]).map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        </td>

                        {/* Has commission */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => updateRow(row.id, { hasCommission: !row.hasCommission })}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                              row.hasCommission
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {row.hasCommission ? 'Có' : 'Không'}
                          </button>
                        </td>

                        {/* TN_NB low */}
                        <td className="px-3 py-2 w-36">
                          <NumericInput
                            className={cellInputCls}
                            value={row.tnNbLow}
                            onChange={(v) => updateRow(row.id, { tnNbLow: v })}
                            placeholder="0"
                          />
                        </td>

                        {/* TN_NB mid */}
                        <td className="px-3 py-2 w-36">
                          <NumericInput
                            className={cellInputCls}
                            value={row.tnNbMid}
                            onChange={(v) => updateRow(row.id, { tnNbMid: v })}
                            placeholder="0"
                          />
                        </td>

                        {/* TN_NB high */}
                        <td className="px-3 py-2 w-36">
                          <NumericInput
                            className={cellInputCls}
                            value={row.tnNbHigh}
                            onChange={(v) => updateRow(row.id, { tnNbHigh: v })}
                            placeholder="0"
                          />
                        </td>

                        {/* Delete */}
                        <td className="px-3 py-2 text-center">
                          {empRows.length > 1 && (
                            <button
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium transition-colors"
                              onClick={() => deleteRow(row.id)}
                            >
                              Xóa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Calculate button */}
          <div className="flex justify-end">
            <button
              onClick={handleCalculate}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              💡 Tính toán & Gợi ý
            </button>
          </div>
        </>
      )}

      {/* ── SUGGESTION TAB ─────────────────────────────────────────────────── */}
      {innerTab === 'suggestion' && suggestions && (
        <div className="flex flex-col gap-4">

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 items-end">
            {/* Name search */}
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tìm tên</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Nhập tên..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
            </div>

            {/* Role filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Chức vụ</label>
              <select
                className={inputCls}
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">Tất cả</option>
                {(Object.entries(ROLE_LABELS) as [string, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Salary range — based on TN_NB mid */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">TN_NB Trung bình từ</label>
              <NumericInput
                className={inputCls + ' w-36'}
                value={filterSalaryMin}
                onChange={setFilterSalaryMin}
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">đến</label>
              <NumericInput
                className={inputCls + ' w-36'}
                value={filterSalaryMax}
                onChange={setFilterSalaryMax}
                placeholder="không giới hạn"
              />
            </div>

            {/* Clear */}
            {(filterName || filterRole || filterSalaryMin > 0 || filterSalaryMax > 0 || quickFilter) && (
              <button
                onClick={() => { setFilterName(''); setFilterRole(''); setFilterSalaryMin(0); setFilterSalaryMax(0); setQuickFilter(''); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>

          {/* Quick filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">Lọc nhanh:</span>
            <button
              onClick={() => setQuickFilter(quickFilter === 'unconfirmed' ? '' : 'unconfirmed')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                quickFilter === 'unconfirmed'
                  ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-400 hover:text-amber-600'
              }`}
            >
              ⏳ Chưa xác nhận
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === 'ot-high' ? '' : 'ot-high')}
              className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                quickFilter === 'ot-high'
                  ? 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-500 dark:text-red-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-red-400 hover:text-red-600'
              }`}
            >
              🔴 OT &gt; 40h
            </button>
          </div>

          {/* Cards */}
          {(() => {
            const filtered = suggestions.filter((sug) => {
              if (filterName && !sug.employee.name.toLowerCase().includes(filterName.toLowerCase())) return false;
              if (filterRole && sug.employee.role !== filterRole) return false;
              if (filterSalaryMin > 0 && sug.mid.tnNb < filterSalaryMin) return false;
              if (filterSalaryMax > 0 && sug.mid.tnNb > filterSalaryMax) return false;
              if (quickFilter === 'unconfirmed' && confirmed.has(sug.employee.id)) return false;
              if (quickFilter === 'ot-high') {
                const entry = confirmed.get(sug.employee.id);
                const empSliders = sliderState.get(sug.employee.id);
                const sl = entry ? entry.sliders : empSliders?.mid;
                if (!sl || (sl.ot1 + sl.ot2 + sl.ot3) <= 40) return false;
              }
              return true;
            });
            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                  Không tìm thấy nhân viên phù hợp với bộ lọc.
                </div>
              );
            }
            return filtered.map((sug) => {
              const empSliders = sliderState.get(sug.employee.id);
              if (!empSliders) return null;
              return (
                <EmployeeCard
                  key={sug.employee.id}
                  suggestion={sug}
                  sliders={empSliders}
                  confirmedEntry={confirmed.get(sug.employee.id)}
                  onSliderChange={(scenario, patch) => updateSlider(sug.employee.id, scenario, patch)}
                  onReset={(scenario) => resetSlider(sug.employee.id, scenario)}
                  onConfirm={(scenario, s) => handleConfirm(sug.employee.id, scenario, s)}
                  onUnconfirm={() => handleUnconfirm(sug.employee.id)}
                />
              );
            });
          })()}
        </div>
      )}

      {/* ── SUMMARY TAB ────────────────────────────────────────────────────── */}
      {innerTab === 'summary' && suggestions && (
        <div className="flex flex-col gap-4">
          <SummaryTable suggestions={suggestions} sliderState={sliderState} confirmed={confirmed} />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {confirmed.size > 0
                ? <span className="text-green-600 dark:text-green-400 font-medium">✓ {confirmed.size} nhân viên đã xác nhận</span>
                : <span className="text-gray-400 italic">Chưa có nhân viên nào được xác nhận</span>
              }
            </span>
            <button
              onClick={handleExport}
              disabled={confirmed.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              📥 Export {confirmed.size > 0 ? `(${confirmed.size} NV)` : ''} Master Data Excel
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for picker */}
      {showEmployeePicker !== null && (
        <div className="fixed inset-0 z-0" onClick={() => setShowEmployeePicker(null)} />
      )}
    </div>
  );
}
