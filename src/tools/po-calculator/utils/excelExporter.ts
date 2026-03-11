import * as XLSX from 'xlsx';
import type { SKURow } from '../types';

const HEADERS = [
  'Mã hàng',
  'Nhóm hàng',
  'Tên hàng',
  'Thuộc tính',
  'AVG',
  'SOH',
  'OO',
  'Week Left',
  'Bare SOH',
  'QTY',
  'Projected SOH',
];

const COL_WIDTHS = [15, 30, 40, 20, 10, 10, 10, 11, 11, 10, 14];

export function exportToExcel(rows: SKURow[], filename = 'PO_Report.xlsx'): void {
  const wb = XLSX.utils.book_new();

  // Build data array: header + rows
  const data: (string | number)[][] = [
    HEADERS,
    ...rows.map((r) => [
      r.sku_code,
      r.category,
      r.product_name,
      r.attribute,
      r.avg,
      r.soh,
      r.oo,
      isFinite(r.week_left) ? Math.round(r.week_left * 10) / 10 : 999,
      r.bare_soh,
      r.qty,
      r.projected_soh,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws['!cols'] = COL_WIDTHS.map((w) => ({ wch: w }));

  // Header row bold styling
  const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
  }

  // Data rows: conditional formatting via cell styles
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const sheetRow = rowIdx + 1; // +1 for header

    const hasOrder = row.qty > 0;
    const isStockout = row.stockout_during_lt;

    for (let c = 0; c < HEADERS.length; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: sheetRow, c });
      if (!ws[cellAddr]) continue;

      let fgColor: string | undefined;
      if (isStockout) {
        fgColor = 'FEE2E2'; // red-100
      } else if (hasOrder) {
        fgColor = 'FEF9C3'; // yellow-100
      }

      ws[cellAddr].s = {
        fill: fgColor ? { patternType: 'solid', fgColor: { rgb: fgColor } } : undefined,
        alignment: {
          horizontal: c >= 4 ? 'right' : 'left', // cols 4+ are numeric
          vertical: 'center',
        },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'PO Report');
  XLSX.writeFile(wb, filename, { bookType: 'xlsx', cellStyles: true });
}
