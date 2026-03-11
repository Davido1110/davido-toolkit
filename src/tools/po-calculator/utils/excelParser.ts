import * as XLSX from 'xlsx';
import type { SKURow, GlobalParams } from '../types';
import { computeRow } from './calculator';

function toNum(val: unknown): number {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export async function parseExcelFile(file: File, params: GlobalParams): Promise<SKURow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays (raw)
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  // Skip header row (index 0), process data rows
  const rows: SKURow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i] as unknown[];
    const sku_code = toStr(r[0]);
    // Skip completely empty rows
    if (!sku_code && !toStr(r[2])) continue;

    const base = {
      id: sku_code || String(i),
      sku_code,
      category: toStr(r[1]),
      product_name: toStr(r[2]),
      attribute: toStr(r[3]),
      avg: toNum(r[4]),
      soh: toNum(r[5]),
      oo: toNum(r[6]),
    };

    rows.push(computeRow(base, params));
  }

  return rows;
}
