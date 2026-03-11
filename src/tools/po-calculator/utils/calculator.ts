import type { SKURow, GlobalParams } from '../types';

export function calcWeekLeft(avg: number, soh: number, oo: number): number {
  return avg > 0 ? (soh + oo) / avg : Infinity;
}

export function calcBareSoh(avg: number, lt: number, soh: number, oo: number): number {
  // Stock physically remaining at Week LT if no new order is placed. Floored at 0.
  return Math.max(0, soh + oo - avg * lt);
}

export function calcQTY(avg: number, lt: number, d: number, soh: number, oo: number): number {
  // Order D weeks of supply unless stock is already sufficient.
  // No-order threshold: week_left > LT + D − 4
  const weekLeft = calcWeekLeft(avg, soh, oo);
  const noOrderThreshold = lt + Math.max(0, d - 4);
  return weekLeft > noOrderThreshold ? 0 : avg * d;
}

export function calcProjectedSOH(avg: number, lt: number, soh: number, oo: number, qty: number): number {
  // Stock at Week LT (when new order arrives) = remaining stock + new order.
  return calcBareSoh(avg, lt, soh, oo) + qty;
}

export function computeRow(
  row: Omit<SKURow, 'week_left' | 'bare_soh' | 'qty' | 'projected_soh' | 'stockout_during_lt'>,
  params: GlobalParams,
): SKURow {
  const week_left = calcWeekLeft(row.avg, row.soh, row.oo);
  const bare_soh = calcBareSoh(row.avg, params.lt, row.soh, row.oo);
  const qty = calcQTY(row.avg, params.lt, params.d, row.soh, row.oo);
  const projected_soh = bare_soh + qty;
  const stockout_during_lt = week_left < params.lt;
  return { ...row, week_left, bare_soh, qty, projected_soh, stockout_during_lt };
}

export function recomputeRow(row: SKURow, params: GlobalParams): SKURow {
  const week_left = calcWeekLeft(row.avg, row.soh, row.oo);
  const bare_soh = calcBareSoh(row.avg, params.lt, row.soh, row.oo);
  const qty = calcQTY(row.avg, params.lt, params.d, row.soh, row.oo);
  const projected_soh = bare_soh + qty;
  const stockout_during_lt = week_left < params.lt;
  return { ...row, week_left, bare_soh, qty, projected_soh, stockout_during_lt };
}
