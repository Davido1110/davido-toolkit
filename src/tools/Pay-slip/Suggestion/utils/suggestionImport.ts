import * as XLSX from 'xlsx';
import type { SuggestionEmployee, EmployeeRole } from '../logic/suggestion';

function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

const ROLE_MAP: Record<string, EmployeeRole> = {
  'quản lý': 'manager', 'giam doc': 'manager', 'giám đốc': 'manager', 'manager': 'manager',
  'trưởng': 'lead', 'truong': 'lead', 'phó phòng': 'lead', 'lead': 'lead',
  'nhân viên đặc thù': 'sales', 'kinh doanh': 'sales', 'thị trường': 'sales', 'sales': 'sales',
  'nhân viên': 'staff', 'staff': 'staff', 'hành chính': 'staff', 'kế toán': 'staff', 'kho': 'staff',
};

function parseRole(val: unknown): EmployeeRole {
  const s = toStr(val).toLowerCase().trim();
  for (const [key, role] of Object.entries(ROLE_MAP)) {
    if (s.includes(key)) return role;
  }
  return 'staff';
}

/**
 * Parse Suggestion input Excel.
 * Expected columns (row 1 = header, row 2+ = data):
 * A: Mã NV | B: Họ tên | C: Pháp nhân (Cty/HKD) | D: Chức vụ
 * E: Có HH (Có/Không)
 * F: TN_NB Thấp | G: TN_NB Trung bình | H: TN_NB Cao
 * Note: Nguồn DT is auto-derived from Pháp nhân (Cty→R1, HKD→R2)
 */
export async function parseSuggestionExcel(file: File): Promise<SuggestionEmployee[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  const rows: SuggestionEmployee[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const name = toStr(r[1]);
    if (!name) continue; // skip blank rows

    const entityRaw = toStr(r[2]);
    const entity = entityRaw === 'HKD' ? 'HKD' as const : 'Cty' as const;
    const revenueSource = entity === 'Cty' ? 'R1' as const : 'R2' as const;

    const role = parseRole(r[3]);

    const hhRaw = toStr(r[4]).toLowerCase();
    const hasCommission = hhRaw === 'có' || hhRaw === 'co' || hhRaw === 'yes' || hhRaw === '1';

    rows.push({
      id: String(Date.now() + Math.random() + i),
      empId: toStr(r[0]),
      name,
      entity,
      role,
      hasCommission,
      revenueSource,
      tnNbLow:  toNum(r[5]),
      tnNbMid:  toNum(r[6]),
      tnNbHigh: toNum(r[7]),
    });
  }

  return rows;
}
