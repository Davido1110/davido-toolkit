import { countWorkingDays } from '../../logic/payroll';

export const S_MIN = 4_960_000;
export type ScenarioKey = 'low' | 'mid' | 'high';

export type EmployeeRole = 'manager' | 'lead' | 'staff' | 'sales';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  manager: 'Quản lý / Giám đốc',
  lead:    'Trưởng/Phó phòng',
  staff:   'Nhân viên (HC, KT, Kho...)',
  sales:   'Nhân viên Đặc thù (KD, TT)',
};

// PC breakdown by role (VNĐ):
// Ăn trưa + Trang phục + Điện thoại + Xăng xe + Nhà ở + Trách nhiệm
export const PC_BY_ROLE: Record<EmployeeRole, number> = {
  manager: 730_000 + 416_000 + 2_000_000 + 2_000_000 + 5_000_000 + 2_000_000, // 12,146,000
  lead:    730_000 + 416_000 + 1_000_000 + 1_000_000 + 2_000_000 + 1_000_000, //  6,146,000
  staff:   730_000 + 416_000 +   300_000 +   500_000,                          //  1,946,000
  sales:   730_000 + 416_000 +   500_000 + 1_000_000,                          //  2,646,000
};

export function pcByRole(role: EmployeeRole): number {
  return PC_BY_ROLE[role];
}

export const PC_BREAKDOWN: Record<EmployeeRole, { label: string; amount: number }[]> = {
  manager: [
    { label: 'Ăn trưa/ca',       amount: 730_000 },
    { label: 'Trang phục',        amount: 416_000 },
    { label: 'Điện thoại',        amount: 2_000_000 },
    { label: 'Xăng xe / Đi lại', amount: 2_000_000 },
    { label: 'Nhà ở',             amount: 5_000_000 },
    { label: 'Trách nhiệm',       amount: 2_000_000 },
  ],
  lead: [
    { label: 'Ăn trưa/ca',       amount: 730_000 },
    { label: 'Trang phục',        amount: 416_000 },
    { label: 'Điện thoại',        amount: 1_000_000 },
    { label: 'Xăng xe / Đi lại', amount: 1_000_000 },
    { label: 'Nhà ở',             amount: 2_000_000 },
    { label: 'Trách nhiệm',       amount: 1_000_000 },
  ],
  staff: [
    { label: 'Ăn trưa/ca',       amount: 730_000 },
    { label: 'Trang phục',        amount: 416_000 },
    { label: 'Điện thoại',        amount: 300_000 },
    { label: 'Xăng xe / Đi lại', amount: 500_000 },
  ],
  sales: [
    { label: 'Ăn trưa/ca',       amount: 730_000 },
    { label: 'Trang phục',        amount: 416_000 },
    { label: 'Điện thoại',        amount: 500_000 },
    { label: 'Xăng xe / Đi lại', amount: 1_000_000 },
  ],
};

const BHXH_RATE = 0.105;
const WORKING_HOURS = 8;

export interface SuggestionEmployee {
  id: string;           // row UUID
  empId: string;        // Mã NV (optional, from DS picker)
  name: string;
  entity: 'Cty' | 'HKD';
  role: EmployeeRole;   // determines PC auto-selection
  hasCommission: boolean;
  revenueSource: 'R1' | 'R2';
  tnNbLow: number;
  tnNbMid: number;
  tnNbHigh: number;
}

export interface SuggestionMonthInput {
  month: string; // "MM/YYYY"
  r1: number;
  r2: number;
}

export interface ScenarioSliders {
  baseSalary: number; // S — step 500k
  pc: number;         // auto-set from employee role
  hhRate: number;     // 0–0.20, step 0.005
  ot1: number;        // 0–100h
  ot2: number;        // 0–80h
  ot3: number;        // 0–50h
}

export interface ScenarioResult {
  bhxh: number;
  hourlyRate: number;
  hh: number;
  otAmount: number;
  gap: number;             // tnNb − S − PC − HH + BHXH (positive = OT needed)
  totalIncome: number;     // S + otAmount + PC + HH − BHXH (deduction=0 assumed)
  delta: number;           // totalIncome − tnNb  (0 = perfect)
  otTotalHours: number;
  unpaidLeaveDays: number; // >0 when gap < 0
  hasLeave: boolean;
}

export interface EmployeeSuggestion {
  employee: SuggestionEmployee;
  workingDays: number;
  revenue: number;
  low:  { tnNb: number; initialSliders: ScenarioSliders };
  mid:  { tnNb: number; initialSliders: ScenarioSliders };
  high: { tnNb: number; initialSliders: ScenarioSliders };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function roundTo500k(n: number): number {
  return Math.round(n / 500_000) * 500_000;
}

function roundTo0001(n: number): number {
  return Math.round(n / 0.0001) * 0.0001;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function selectRevenue(revenueSource: 'R1' | 'R2', r1: number, r2: number): number {
  return revenueSource === 'R1' ? r1 : r2;
}

// ── Core pure computation ──────────────────────────────────────────────────

export function computeScenarioResult(
  sliders: ScenarioSliders,
  tnNb: number,
  workingDays: number,
  hasCommission: boolean,
  revenue: number
): ScenarioResult {
  const { baseSalary, pc, hhRate, ot1, ot2, ot3 } = sliders;
  const bhxh = baseSalary * BHXH_RATE;
  const hourlyRate = workingDays > 0 ? baseSalary / (workingDays * WORKING_HOURS) : 0;
  const hh = hasCommission ? hhRate * revenue : 0;
  const otAmount = hourlyRate * (1.5 * ot1 + 2.0 * ot2 + 3.0 * ot3);
  const gap = tnNb - baseSalary - pc - hh + bhxh;
  const totalIncome = baseSalary + otAmount + pc + hh - bhxh;
  const delta = totalIncome - tnNb;
  const otTotalHours = ot1 + ot2 + ot3;
  const hasLeave = gap < 0;
  const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
  const unpaidLeaveDays = hasLeave && dailyRate > 0 ? Math.abs(gap) / dailyRate : 0;

  return { bhxh, hourlyRate, hh, otAmount, gap, totalIncome, delta, otTotalHours, unpaidLeaveDays, hasLeave };
}

// ── Initial slider builder ─────────────────────────────────────────────────

export function buildInitialSliders(
  tnNb: number,
  workingDays: number,
  hasCommission: boolean,
  revenue: number,
  role: EmployeeRole
): ScenarioSliders {
  const pc = pcByRole(role);

  // S: target 50%, clamped [max(S_MIN, 30%), 80%]
  const sRaw = roundTo500k(tnNb * 0.5);
  const sMin = Math.max(S_MIN, tnNb * 0.3);
  const sMax = tnNb * 0.8;
  const baseSalary = clamp(sRaw, sMin, sMax);

  const bhxh = baseSalary * BHXH_RATE;

  // HH rate: target HH ≈ tnNb × 30%
  let hhRate = 0;
  let hh = 0;
  if (hasCommission && revenue > 0) {
    const hhTarget = tnNb * 0.3;
    hhRate = clamp(roundTo0001(hhTarget / revenue), 0, 0.01);
    hh = hhRate * revenue;
  }

  // Gap and OT1 to fill gap
  const gap = tnNb - baseSalary - pc - hh + bhxh;
  const hourlyRate = workingDays > 0 ? baseSalary / (workingDays * WORKING_HOURS) : 0;
  let ot1 = 0;
  if (gap > 0 && hourlyRate > 0) {
    ot1 = clamp(gap / (hourlyRate * 1.5), 0, 100);
  }

  return { baseSalary, pc, hhRate, ot1, ot2: 0, ot3: 0 };
}

// ── Main entry point ───────────────────────────────────────────────────────

export function buildEmployeeSuggestion(
  emp: SuggestionEmployee,
  monthInput: SuggestionMonthInput
): EmployeeSuggestion {
  const workingDays = countWorkingDays(monthInput.month);
  const revenue = selectRevenue(emp.revenueSource, monthInput.r1, monthInput.r2);

  return {
    employee: emp,
    workingDays,
    revenue,
    low:  { tnNb: emp.tnNbLow,  initialSliders: buildInitialSliders(emp.tnNbLow,  workingDays, emp.hasCommission, revenue, emp.role) },
    mid:  { tnNb: emp.tnNbMid,  initialSliders: buildInitialSliders(emp.tnNbMid,  workingDays, emp.hasCommission, revenue, emp.role) },
    high: { tnNb: emp.tnNbHigh, initialSliders: buildInitialSliders(emp.tnNbHigh, workingDays, emp.hasCommission, revenue, emp.role) },
  };
}
