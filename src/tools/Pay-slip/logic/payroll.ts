import type {
  Employee,
  MonthlyInput,
  PayrollConstants,
  PayrollRow,
  ReconciliationSummary,
  Warning,
} from '../types';

/** Count Mon–Fri working days in a given "MM/YYYY" month (Ds). */
export function countWorkingDays(month: string): number {
  const [mm, yyyy] = month.split('/').map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(yyyy, mm - 1, d).getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function calcCommission(emp: Employee, r1: number, r2: number): number {
  if (!emp.hasCommission) return 0;
  return emp.commissionRate * (emp.entity === 'Cty' ? r1 : r2);
}

export function calcEmployeePayroll(
  emp: Employee,
  internalIncome: number,
  r1: number,
  r2: number,
  workingDays: number,
  consts: PayrollConstants
): PayrollRow {
  const warnings: Warning[] = [];

  if (internalIncome === 0) {
    warnings.push({ level: 'warning', message: 'Thu nhập nội bộ = 0' });
  }

  // Step 1: Fixed components
  const commission = calcCommission(emp, r1, r2);
  const bhxh = emp.baseSalary * consts.bhxhRate;

  if (commission > internalIncome && internalIncome > 0) {
    warnings.push({ level: 'error', message: 'Hoa hồng vượt quá thu nhập nội bộ' });
  }

  // Step 2: Gap = TN_NB − S − PC − HH + BHXH
  // (BHXH is added because in the constraint it's subtracted on the right side)
  const gap = internalIncome - emp.baseSalary - emp.allowance - commission + bhxh;

  const hourlyRate = emp.baseSalary / workingDays / consts.workingHoursPerDay;
  const dailyRate = emp.baseSalary / workingDays;

  let unpaidLeaveDays = 0;
  let deduction = 0;
  let otHours1 = 0;
  let otHours2 = 0;
  let otHours3 = 0;
  let otAmount = 0;
  let thuongNong = 0;

  if (gap > 0) {
    // Step 3a: Smart OT allocation
    const otHourlyRate1 = hourlyRate * consts.otMultiplier1; // ×1.5
    const otHourlyRate2 = hourlyRate * consts.otMultiplier2; // ×2.0
    const tentativeOt1 = otHourlyRate1 > 0 ? gap / otHourlyRate1 : 0;

    if (tentativeOt1 <= consts.otWarningYellow) {
      // Normal: OT×1.5, hours within 40h limit
      otHours1 = tentativeOt1;
      otAmount = gap;
    } else {
      // Convert all to OT×2 to reduce hours
      const tentativeOt2 = otHourlyRate2 > 0 ? gap / otHourlyRate2 : 0;
      if (tentativeOt2 <= consts.otWarningYellow) {
        // Fits within 40h at ×2.0
        otHours2 = tentativeOt2;
        otAmount = gap;
      } else {
        // Cap OT×2 at 40h, remainder → Thưởng nóng
        otHours2 = consts.otWarningYellow;
        otAmount = otHours2 * otHourlyRate2;
        thuongNong = gap - otAmount;
      }
    }
  } else if (gap < 0) {
    // Step 3b: Gap < 0 → unpaid leave days
    unpaidLeaveDays = dailyRate > 0 ? Math.abs(gap) / dailyRate : 0;
    deduction = dailyRate * unpaidLeaveDays; // = |gap|
    if (unpaidLeaveDays > workingDays) {
      warnings.push({
        level: 'error',
        message: `Ngày nghỉ (${unpaidLeaveDays.toFixed(2)} ngày) vượt số ngày công chuẩn (${workingDays} ngày)`,
      });
    }
  }
  // gap === 0: no OT, no unpaid leave — all zeros

  if (thuongNong > 0) {
    warnings.push({ level: 'warning', message: `OT×2 đã đạt ${consts.otWarningYellow}h — phần còn lại (${Math.round(thuongNong).toLocaleString('vi-VN')} đ) chuyển sang Thưởng nóng` });
  }

  // grossSalary = S − Deduction + OT_Amount
  const grossSalary = emp.baseSalary - deduction + otAmount;
  const allowance = emp.allowance;

  // Step 4: Verify constraint: S − Deduction + OT + Thưởng nóng + PC + HH − BHXH = TN_NB
  const totalIncome = grossSalary + thuongNong + allowance + commission - bhxh;

  return {
    employeeId: emp.id,
    name: emp.name,
    entity: emp.entity,
    baseSalary: emp.baseSalary,
    workingDays,
    unpaidLeaveDays,
    deduction,
    bhxh,
    commission,
    otHours1,
    otHours2,
    otHours3,
    otAmount,
    thuongNong,
    grossSalary,
    allowance,
    totalIncome,
    warnings,
  };
}

export function runPayroll(
  employees: Employee[],
  input: MonthlyInput,
  consts: PayrollConstants
): PayrollRow[] {
  const workingDays = input.workingDays || countWorkingDays(input.month);
  const incomeMap = new Map<string, number>(
    input.incomes.map((e) => [e.employeeId, e.amount])
  );

  return employees.map((emp) => {
    const hasEntry = incomeMap.has(emp.id);
    const internalIncome = incomeMap.get(emp.id) ?? 0;
    const row = calcEmployeePayroll(emp, internalIncome, input.r1, input.r2, workingDays, consts);
    if (!hasEntry) {
      row.warnings.push({ level: 'warning', message: 'Không có mục nhập thu nhập cho nhân viên này' });
    }
    return row;
  });
}

export function buildReconciliation(
  rows: PayrollRow[],
  input: MonthlyInput
): ReconciliationSummary {
  const ctyTotal = rows.filter((r) => r.entity === 'Cty').reduce((s, r) => s + r.totalIncome, 0);
  const hkdTotal = rows.filter((r) => r.entity === 'HKD').reduce((s, r) => s + r.totalIncome, 0);
  const grandTotal = ctyTotal + hkdTotal;
  const internalTotal = input.incomes.reduce((s, e) => s + e.amount, 0);
  const matched = Math.abs(grandTotal - internalTotal) < 1; // within 1 VND tolerance
  return { ctyTotal, hkdTotal, grandTotal, internalTotal, matched };
}
