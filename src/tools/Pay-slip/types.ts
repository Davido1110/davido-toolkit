export type Entity = 'Cty' | 'HKD';

export interface Employee {
  id: string;
  name: string;
  entity: Entity;
  baseSalary: number;
  hasCommission: boolean;
  commissionRate: number; // decimal, e.g. 0.05
  allowance: number;
}

export interface IncomeEntry {
  employeeId: string;
  amount: number;
}

export interface MonthlyInput {
  month: string; // "MM/YYYY"
  workingDays: number; // Ds — auto-calculated from month, but editable
  r1: number;
  r2: number;
  incomes: IncomeEntry[];
}

export type InputAction =
  | { type: 'SET_MONTH'; month: string; workingDays: number }
  | { type: 'SET_WORKING_DAYS'; workingDays: number }
  | { type: 'SET_R1'; r1: number }
  | { type: 'SET_R2'; r2: number }
  | { type: 'SET_INCOME'; employeeId: string; amount: number }
  | { type: 'IMPORT_INCOMES'; incomes: IncomeEntry[] }
  | { type: 'RESET' };

export interface Warning {
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface PayrollRow {
  employeeId: string;
  name: string;
  entity: Entity;
  baseSalary: number;
  workingDays: number;      // Ds — auto-calculated Mon–Fri in month
  unpaidLeaveDays: number;  // Du — only when gap < 0
  deduction: number;        // S / Ds × Du — subtracted from salary
  bhxh: number;             // S × bhxhRate (employee portion)
  commission: number;       // HH = commissionRate × R1/R2
  otHours1: number;         // OT ngày thường (1.5x)
  otHours2: number;         // OT cuối tuần (2.0x)
  otHours3: number;         // OT lễ/tết (3.0x)
  otAmount: number;         // total OT money (capped at 40h×2.0x if smart allocation kicks in)
  thuongNong: number;       // "Thưởng nóng" — gap remainder when OT×2 is capped at 40h
  grossSalary: number;      // baseSalary − deduction + otAmount (display helper)
  allowance: number;        // PC (fixed from master data)
  totalIncome: number;      // = TN_NB — must always match ✔
  warnings: Warning[];
}

export interface ReconciliationSummary {
  ctyTotal: number;
  hkdTotal: number;
  grandTotal: number;
  internalTotal: number;
  matched: boolean;
}

export interface PayrollConstants {
  allowanceBase: number;       // default allowance for new employees form
  workingHoursPerDay: number;  // H — default 8
  otMultiplier1: number;       // 1.5x — weekday OT
  otMultiplier2: number;       // 2.0x — weekend OT
  otMultiplier3: number;       // 3.0x — holiday OT
  otWarningYellow: number;     // 40h/month threshold
  otWarningRed: number;        // 72h/month threshold
  bhxhRate: number;            // 0.105 = 10.5% employee contribution
}

export type ActiveTab = 'input' | 'result' | 'guide' | 'suggestion';
