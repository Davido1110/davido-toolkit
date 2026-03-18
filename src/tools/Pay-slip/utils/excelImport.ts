import * as XLSX from 'xlsx';
import type { Employee, IncomeEntry, Entity } from '../types';

function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse employee Excel file (Suggestion master-data export format).
 * Columns (row 1 = header):
 * A: Mã NV | B: Họ tên | C: Pháp nhân | D: Lương HĐLĐ | E: Phụ cấp
 * F: Tỷ lệ HH (%)
 * hasCommission is derived: commissionRate > 0 → Có, else Không
 */
export async function parseEmployeeExcel(file: File): Promise<Employee[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  const employees: Employee[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const id = toStr(r[0]);
    if (!id) continue;

    const entityRaw = toStr(r[2]);
    const entity: Entity = entityRaw === 'HKD' ? 'HKD' : 'Cty';

    let commissionRate = toNum(r[5]);
    if (commissionRate > 1) commissionRate = commissionRate / 100;
    const hasCommission = commissionRate > 0;

    employees.push({
      id,
      name: toStr(r[1]),
      entity,
      baseSalary: toNum(r[3]),
      allowance: toNum(r[4]) || 1_000_000,
      hasCommission,
      commissionRate,
    });
  }

  return employees;
}

/**
 * Parse income Excel file.
 * Columns:
 * A: Mã NV | B: Tổng TN nội bộ
 */
export async function parseIncomeExcel(file: File): Promise<IncomeEntry[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  const entries: IncomeEntry[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const employeeId = toStr(r[0]);
    if (!employeeId) continue;
    entries.push({ employeeId, amount: toNum(r[1]) });
  }

  return entries;
}

/**
 * Parse combined monthly Excel file (employees + internal income in one sheet).
 * Columns (row 1 = header):
 * A: Mã NV | B: Họ tên | C: Pháp nhân | D: Lương HĐLĐ | E: Phụ cấp
 * F: Tỷ lệ HH (%) | G: TN nội bộ
 * hasCommission is derived: commissionRate > 0 → Có, else Không
 */
export async function parseCombinedExcel(
  file: File
): Promise<{ employees: Employee[]; incomes: IncomeEntry[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  const employees: Employee[] = [];
  const incomes: IncomeEntry[] = [];

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const id = toStr(r[0]);
    if (!id) continue;

    const entityRaw = toStr(r[2]);
    const entity: Entity = entityRaw === 'HKD' ? 'HKD' : 'Cty';

    let commissionRate = toNum(r[5]);
    if (commissionRate > 1) commissionRate = commissionRate / 100;
    const hasCommission = commissionRate > 0;

    employees.push({
      id,
      name: toStr(r[1]),
      entity,
      baseSalary: toNum(r[3]),
      allowance: toNum(r[4]) || 1_000_000,
      hasCommission,
      commissionRate,
    });

    incomes.push({ employeeId: id, amount: toNum(r[6]) });
  }

  return { employees, incomes };
}

/**
 * Generate a combined sample Excel file and trigger download.
 * Columns: Mã NV | Họ tên | Pháp nhân | Lương HĐLĐ | Phụ cấp | Tỷ lệ HH (%) | TN nội bộ
 * Note: No "Có HH" column — hasCommission is derived from Tỷ lệ HH > 0
 */
export function downloadCombinedTemplate(): void {
  const header = ['Mã NV', 'Họ tên', 'Pháp nhân', 'Lương HĐLĐ', 'Phụ cấp', 'Tỷ lệ HH (%)', 'TN nội bộ'];
  const rows = [
    ['0011', 'Đỗ Đức Trung',      'Cty', 25000000, 12146000, 0.20, 51000000],
    ['0226', 'Võ Trọng Sang',     'HKD', 15000000,  6146000, 0.02, 40000000],
    ['0220', 'Nguyễn Thị Vân Ly', 'Cty', 11500000,  2646000, 0.03, 18000000],
    ['0154', 'Kim Văn Cường',     'HKD', 12000000,  2646000, 0,    20000000],
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = [
    { wch: 10 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nhap Thang');
  XLSX.writeFile(wb, 'mau-nhap-thang.xlsx');
}
