export interface SKURow {
  id: string;          // unique row key (sku_code or index fallback)
  sku_code: string;
  category: string;    // e.g. "Electronics > Phones > iPhone"
  product_name: string;
  attribute: string;
  avg: number;               // editable — average weekly sales
  soh: number;               // editable — stock on hand
  oo: number;                // editable — on order
  week_left: number;         // calculated — (SOH + OO) / AVG
  bare_soh: number;          // calculated — max(0, SOH + OO − AVG × LT): SOH at W[LT] if no order
  qty: number;               // calculated
  projected_soh: number;     // calculated — bare_soh + qty
  stockout_during_lt: boolean; // calculated — week_left < LT
}

export interface GlobalParams {
  lt: number; // Lead Time in weeks (default 12)
  d: number;  // Demand Factor — weeks of supply to order per PO (default 12)
}

export type AppStep = 'upload' | 'review' | 'export';

export interface FilterState {
  level1: string;
  level2: string;
  level3: string;
  search: string;
}
