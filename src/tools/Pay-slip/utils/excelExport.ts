import ExcelJS from 'exceljs';
import type { PayrollRow, ReconciliationSummary } from '../types';

// ─── Tailwind → Hex colour map (matches web UI exactly) ──────────────────────
const C = {
  // Header
  hdrBg:       'F9FAFB',   // gray-50
  hdrText:     '6B7280',   // gray-500
  // OT group headers
  ot15Bg:      'EFF6FF',   // blue-50
  ot15Text:    '2563EB',   // blue-600
  ot2Bg:       'EEF2FF',   // indigo-50
  ot2Text:     '4F46E5',   // indigo-600
  ot3Bg:       'F5F3FF',   // violet-50
  ot3Text:     '7C3AED',   // violet-600
  unpaidBg:    'FFF7ED',   // orange-50
  unpaidText:  'EA580C',   // orange-600
  // Data cell text colours
  blue:        '2563EB',   // text-blue-600   (OT×1.5 data)
  indigo:      '4F46E5',   // text-indigo-600 (OT×2 data)
  violet:      '7C3AED',   // text-violet-600 (OT×3 data)
  orange:      'F97316',   // text-orange-500 (unpaid data)
  rose:        'E11D48',   // text-rose-600   (Thưởng nóng)
  emerald:     '047857',   // text-emerald-700 (Hoa hồng)
  teal:        '0F766E',   // text-teal-700   (Phụ cấp)
  red:         'EF4444',   // text-red-500    (BHXH)
  green:       '15803D',   // text-green-700  (Tổng TN)
  neutral:     '374151',   // gray-700        (regular data)
  muted:       '9CA3AF',   // gray-400        (Mã NV, Công chuẩn)
  // Row backgrounds
  rowWhite:    'FFFFFF',
  rowAlt:      'F9FAFB',   // gray-50/50
  rowError:    'FEF2F2',   // red-50
  rowWarn:     'FEFCE8',   // yellow-50
  totalsBg:    'F3F4F6',   // gray-100
  // Entity badge
  ctyBg:       'DBEAFE',   // blue-100
  ctyText:     '1D4ED8',   // blue-700
  hkdBg:       'F3E8FF',   // purple-100
  hkdText:     '7E22CE',   // purple-700
  // Borders
  border:      'E5E7EB',   // gray-200
  borderStrong:'9CA3AF',   // gray-400
  // Title
  titleBg:     'EFF6FF',   // blue-50
  titleText:   '1E3A5F',
};

// ─── Number formats ───────────────────────────────────────────────────────────
const Z = {
  money:   '#,##0',
  money0:  '#,##0;-#,##0;"—"',
  moneyNeg:'#,##0;[Red]-#,##0;"—"',  // negative = red
  hours:   '#,##0.00',
  hours0:  '#,##0.00;-#,##0.00;"—"',
};

// ─── Column definitions ───────────────────────────────────────────────────────
interface Col {
  header:   string;
  width:    number;
  numFmt?:  string;
  align:    'left' | 'right' | 'center';
  textColor?: string;   // data cell text colour
  bold?:    boolean;    // data cell bold
  group?:   string;
  groupBg?: string;
  groupText?: string;
}

const COLS: Col[] = [
  { header: 'Mã NV',           width: 10, align: 'left',   textColor: C.muted },
  { header: 'Họ tên',          width: 28, align: 'left',   textColor: C.neutral, bold: false },
  { header: 'Pháp nhân',       width: 11, align: 'center'  },   // special: entity-coloured
  { header: 'Lương HĐLĐ',      width: 17, align: 'right',  numFmt: Z.money,  textColor: C.neutral },
  { header: 'Công chuẩn',      width: 12, align: 'right',  numFmt: Z.hours,  textColor: C.muted   },
  { header: 'Số công đi làm',  width: 15, align: 'right',  numFmt: Z.hours,  textColor: C.muted   },
  { header: 'Tiền công',       width: 17, align: 'right',  numFmt: Z.money,  textColor: C.neutral },
  // OT ×1.5
  { header: 'Giờ',   width: 12, align: 'right', numFmt: Z.hours0, textColor: C.blue,   group: 'OT ×1.5', groupBg: C.ot15Bg, groupText: C.ot15Text },
  { header: 'Tiền',  width: 17, align: 'right', numFmt: Z.money0, textColor: C.blue,   group: 'OT ×1.5', groupBg: C.ot15Bg, groupText: C.ot15Text },
  // OT ×2
  { header: 'Giờ',   width: 12, align: 'right', numFmt: Z.hours0, textColor: C.indigo, group: 'OT ×2',   groupBg: C.ot2Bg,  groupText: C.ot2Text  },
  { header: 'Tiền',  width: 17, align: 'right', numFmt: Z.money0, textColor: C.indigo, group: 'OT ×2',   groupBg: C.ot2Bg,  groupText: C.ot2Text  },
  // OT ×3
  { header: 'Giờ',   width: 12, align: 'right', numFmt: Z.hours0, textColor: C.violet, group: 'OT ×3',   groupBg: C.ot3Bg,  groupText: C.ot3Text  },
  { header: 'Tiền',  width: 17, align: 'right', numFmt: Z.money0, textColor: C.violet, group: 'OT ×3',   groupBg: C.ot3Bg,  groupText: C.ot3Text  },
  // Nghỉ không lương
  { header: 'Ngày',     width: 12, align: 'right', numFmt: Z.hours0, textColor: C.orange, group: 'Nghỉ không lương', groupBg: C.unpaidBg, groupText: C.unpaidText },
  { header: 'Tiền trừ', width: 17, align: 'right', numFmt: Z.money0, textColor: C.orange, group: 'Nghỉ không lương', groupBg: C.unpaidBg, groupText: C.unpaidText },
  // Summary
  { header: 'Tổng tiền lương', width: 18, align: 'right', numFmt: Z.money,  textColor: C.neutral, bold: true  },
  { header: 'Thưởng nóng',     width: 16, align: 'right', numFmt: Z.money0, textColor: C.rose                },
  { header: 'Hoa hồng',        width: 16, align: 'right', numFmt: Z.money0, textColor: C.emerald             },
  { header: 'Phụ cấp',         width: 14, align: 'right', numFmt: Z.money,  textColor: C.teal                },
  { header: 'BHXH (−)',         width: 14, align: 'right', numFmt: Z.money,  textColor: C.red                 },
  { header: 'Tổng TN',          width: 17, align: 'right', numFmt: Z.money,  textColor: C.green, bold: true   },
];

const NC = COLS.length;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function argb(hex: string): string { return 'FF' + hex; }

function solidFill(cell: ExcelJS.Cell, hex: string): void {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(hex) } };
}

function thinBorder(cell: ExcelJS.Cell, hex = C.border): void {
  const s: ExcelJS.Border = { style: 'thin', color: { argb: argb(hex) } };
  cell.border = { top: s, bottom: s, left: s, right: s };
}

function thickBottom(cell: ExcelJS.Cell): void {
  const thin: ExcelJS.Border = { style: 'thin',   color: { argb: argb(C.border) } };
  const med:  ExcelJS.Border = { style: 'medium', color: { argb: argb(C.borderStrong) } };
  cell.border = { top: thin, bottom: med, left: thin, right: thin };
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────

function buildDetailSheet(wb: ExcelJS.Workbook, rows: PayrollRow[], month: string): void {
  const ws = wb.addWorksheet(`Bảng lương ${month.replace('/', '-')}`);
  ws.columns = COLS.map(col => ({ width: col.width }));

  // ── Row 1: Title ────────────────────────────────────────────────────────────
  const titleRow = ws.addRow([`BẢNG LƯƠNG THÁNG ${month}`]);
  titleRow.height = 32;
  ws.mergeCells(1, 1, 1, NC);
  const titleCell = titleRow.getCell(1);
  titleCell.font      = { bold: true, size: 14, color: { argb: argb(C.titleText) } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  solidFill(titleCell, C.titleBg);
  thinBorder(titleCell, '93C5FD');

  // ── Compute group spans ──────────────────────────────────────────────────────
  const groupSpans = new Map<string, { s: number; e: number; bg: string; text: string }>();
  COLS.forEach((col, ci) => {
    if (!col.group) return;
    const ex = groupSpans.get(col.group);
    if (!ex) groupSpans.set(col.group, { s: ci + 1, e: ci + 1, bg: col.groupBg!, text: col.groupText! });
    else ex.e = ci + 1;
  });

  // ── Row 2: Group headers ─────────────────────────────────────────────────────
  const grpRow = ws.addRow([]);
  grpRow.height = 22;

  // Non-grouped → gray-50 header (will span rows 2–3)
  COLS.forEach((col, ci) => {
    if (col.group) return;
    const cell = grpRow.getCell(ci + 1);
    solidFill(cell, C.hdrBg);
    thinBorder(cell, C.border);
  });

  // Grouped → coloured group label
  groupSpans.forEach(({ s, e, bg, text }, label) => {
    // fill all cells in the span
    for (let ci = s; ci <= e; ci++) {
      const cell = grpRow.getCell(ci);
      solidFill(cell, bg);
      thinBorder(cell, C.border);
    }
    const cell = grpRow.getCell(s);
    cell.value     = label;
    cell.font      = { bold: true, size: 10, color: { argb: argb(text) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    if (s < e) ws.mergeCells(2, s, 2, e);
  });

  // ── Row 3: Sub-headers ───────────────────────────────────────────────────────
  const subRow = ws.addRow(COLS.map(col => col.header));
  subRow.height = 28;

  COLS.forEach((col, ci) => {
    const cell = subRow.getCell(ci + 1);
    cell.font      = { bold: true, size: 10, color: { argb: argb(col.group ? col.groupText! : C.hdrText) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    solidFill(cell, col.group ? col.groupBg! : C.hdrBg);
    // non-grouped: merge rows 2–3
    if (!col.group) {
      thickBottom(cell);
      ws.mergeCells(2, ci + 1, 3, ci + 1);
      // also apply style to row-2 cell
      const grpCell = grpRow.getCell(ci + 1);
      grpCell.font      = { bold: true, size: 10, color: { argb: argb(C.hdrText) } };
      grpCell.alignment = { horizontal: ci < 3 ? 'left' : 'center', vertical: 'middle', wrapText: true };
      grpCell.value     = col.header;
    } else {
      thickBottom(cell);
    }
  });

  // Freeze: 3 header rows + 2 name columns
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 3, activeCell: 'C4' }];

  // ── Data rows ────────────────────────────────────────────────────────────────
  rows.forEach((r, ri) => {
    const hr     = r.baseSalary / r.workingDays / 8;
    const otAmt1 = r.otHours1 * hr * 1.5;
    const otAmt2 = r.otHours2 * hr * 2.0;
    const otAmt3 = r.otHours3 * hr * 3.0;

    const hasError = r.warnings.some(w => w.level === 'error');
    const hasWarn  = r.warnings.some(w => w.level === 'warning');
    const rowBg    = hasError ? C.rowError : hasWarn ? C.rowWarn : ri % 2 === 0 ? C.rowWhite : C.rowAlt;

    const dataRow = ws.addRow([
      r.employeeId,
      r.name,
      r.entity,
      r.baseSalary,
      r.workingDays,
      r.workingDays - r.unpaidLeaveDays,
      r.baseSalary - r.deduction,
      r.otHours1, otAmt1,
      r.otHours2, otAmt2,
      r.otHours3, otAmt3,
      r.unpaidLeaveDays,
      r.deduction > 0 ? -r.deduction : 0,   // negative deduction
      r.grossSalary,
      r.thuongNong,
      r.commission,
      r.allowance,
      -r.bhxh,                               // BHXH always negative
      r.totalIncome,
    ]);
    dataRow.height = 18;

    COLS.forEach((col, ci) => {
      const cell = dataRow.getCell(ci + 1);
      // Entity column: coloured badge
      if (ci === 2) {
        const isCty = r.entity === 'Cty';
        solidFill(cell, isCty ? C.ctyBg : C.hkdBg);
        cell.font      = { bold: true, size: 10, color: { argb: argb(isCty ? C.ctyText : C.hkdText) } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        thinBorder(cell);
        return;
      }
      solidFill(cell, rowBg);
      cell.font      = { size: 10, bold: col.bold ?? false, color: { argb: argb(col.textColor ?? C.neutral) } };
      cell.alignment = { horizontal: col.align, vertical: 'middle' };
      if (col.numFmt) cell.numFmt = col.numFmt;
      thinBorder(cell);
    });
  });

  // ── Totals row ────────────────────────────────────────────────────────────────
  const hr  = (r: PayrollRow) => r.baseSalary / r.workingDays / 8;
  const sum = (fn: (r: PayrollRow) => number) => rows.reduce((s, r) => s + fn(r), 0);

  const totalsRow = ws.addRow([
    `Tổng (${rows.length} NV)`, '', '',
    sum(r => r.baseSalary),
    '',
    sum(r => r.workingDays - r.unpaidLeaveDays),
    sum(r => r.baseSalary - r.deduction),
    sum(r => r.otHours1), sum(r => r.otHours1 * hr(r) * 1.5),
    sum(r => r.otHours2), sum(r => r.otHours2 * hr(r) * 2.0),
    sum(r => r.otHours3), sum(r => r.otHours3 * hr(r) * 3.0),
    sum(r => r.unpaidLeaveDays),
    -sum(r => r.deduction),
    sum(r => r.grossSalary),
    sum(r => r.thuongNong),
    sum(r => r.commission),
    sum(r => r.allowance),
    -sum(r => r.bhxh),
    sum(r => r.totalIncome),
  ]);
  totalsRow.height = 22;

  COLS.forEach((col, ci) => {
    const cell = totalsRow.getCell(ci + 1);
    solidFill(cell, C.totalsBg);
    cell.font      = { bold: true, size: 10, color: { argb: argb(col.textColor ?? C.neutral) } };
    cell.alignment = { horizontal: ci < 3 ? 'left' : col.align, vertical: 'middle' };
    if (col.numFmt && ci > 2) cell.numFmt = col.numFmt;
    const med: ExcelJS.Border  = { style: 'medium', color: { argb: argb(C.borderStrong) } };
    const thin: ExcelJS.Border = { style: 'thin',   color: { argb: argb(C.border) } };
    cell.border = { top: med, bottom: med, left: thin, right: thin };
  });
}

// ─── Đối soát sheet ───────────────────────────────────────────────────────────

function buildSummarySheet(wb: ExcelJS.Workbook, summary: ReconciliationSummary, month: string): void {
  const ws = wb.addWorksheet('Đối soát');
  ws.columns = [{ width: 38 }, { width: 24 }];

  const diff    = summary.grandTotal - summary.internalTotal;
  const matched = summary.matched;

  // Title
  const titleRow = ws.addRow([`ĐỐI SOÁT BẢNG LƯƠNG — THÁNG ${month}`]);
  titleRow.height = 30;
  ws.mergeCells(1, 1, 1, 2);
  const tc = titleRow.getCell(1);
  tc.font      = { bold: true, size: 13, color: { argb: argb(C.titleText) } };
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  solidFill(tc, C.titleBg);
  thinBorder(tc, '93C5FD');

  // Header
  const hdrRow = ws.addRow(['Khoản mục', 'Số tiền (VNĐ)']);
  hdrRow.height = 22;
  [1, 2].forEach(ci => {
    const cell = hdrRow.getCell(ci);
    cell.font      = { bold: true, size: 10, color: { argb: argb(C.hdrText) } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    solidFill(cell, C.hdrBg);
    thickBottom(cell);
  });

  const dataRows: [string, number | string, string, string][] = [
    ['Tổng lương Cty Leonardo',       summary.ctyTotal,       C.rowWhite, C.neutral],
    ['Tổng lương HKD Lê Khắc Thông',  summary.hkdTotal,       C.rowAlt,   C.neutral],
    ['Tổng lương toàn công ty',        summary.grandTotal,     C.rowWhite, C.neutral],
    ['Tổng TN nội bộ',                summary.internalTotal,  C.rowAlt,   C.neutral],
    ['Chênh lệch',                    diff,                   C.rowWhite, Math.abs(diff) < 1 ? C.green : C.red],
    ['Kết quả',                        matched ? 'KHỚP ✅' : 'KHÔNG KHỚP ❌', matched ? '': '', matched ? C.green : C.red],
  ];

  dataRows.forEach(([label, val, bg, textColor], i) => {
    const isResult = i === dataRows.length - 1;
    const rowBg    = isResult ? (matched ? 'DCFCE7' : 'FEE2E2') : bg;
    const row      = ws.addRow([label, typeof val === 'number' ? val : val]);
    row.height     = 20;

    const lCell = row.getCell(1);
    lCell.font      = { size: 11, bold: isResult, color: { argb: argb(textColor) } };
    lCell.alignment = { horizontal: 'left', vertical: 'middle' };
    solidFill(lCell, rowBg);
    thinBorder(lCell);

    const vCell = row.getCell(2);
    vCell.font      = { size: isResult ? 12 : 11, bold: isResult, color: { argb: argb(textColor) } };
    vCell.alignment = { horizontal: isResult ? 'center' : 'right', vertical: 'middle' };
    if (typeof val === 'number') vCell.numFmt = Z.money;
    solidFill(vCell, rowBg);
    thinBorder(vCell);
  });
}

// ─── Public export ────────────────────────────────────────────────────────────

export async function exportReconciliationExcel(
  rows: PayrollRow[],
  summary: ReconciliationSummary,
  month: string
): Promise<void> {
  const wb     = new ExcelJS.Workbook();
  wb.creator   = 'Davido Toolkit';
  wb.created   = new Date();

  buildDetailSheet(wb, rows, month);
  buildSummarySheet(wb, summary, month);

  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Bang_Luong_${month.replace('/', '-')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
