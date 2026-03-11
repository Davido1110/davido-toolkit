# PO Calculator Tool — CLAUDE.md

## Project Overview

A client-side, single-page React application for Purchase Order planning and inventory optimization. Users upload an Excel file of SKU-level inventory data, configure global parameters, review/edit calculated suggestions, and export a formatted Excel report.

---

## Stack & Libraries

- **Framework**: React (SPA, no backend)
- **Excel I/O**: SheetJS (`xlsx`) or ExcelJS — in-browser parsing and generation
- **Language**: TypeScript preferred
- **Styling**: TailwindCSS or CSS modules
- **Table rendering**: Virtual/windowed list (`@tanstack/react-virtual`) to handle 1,000+ rows smoothly

---

## Core Calculation Logic

### Step 1 — Weeks Left
How many weeks current stock (SOH + OO) will last at current sales rate:
```
week_left = (SOH + OO) / AVG
```

### Step 2 — Bare SOH (SOH at W[LT] if no order placed)
Stock physically remaining when a new order would arrive, assuming no order is placed:
```
bare_soh = max(0, SOH + OO − AVG × LT)
```
Floored at 0 — inventory cannot go negative in reality.

### Step 3 — Order Quantity (QTY)
Decision based on `week_left` compared to LT and D:

| Condition | Meaning | QTY |
|-----------|---------|-----|
| `week_left < LT` | Will stock out before order arrives | `AVG × D` |
| `LT ≤ week_left ≤ LT + 4` | Close to reorder point, still order | `AVG × D` |
| `LT + 4 < week_left ≤ LT + D − 4` | Grey zone — still order | `AVG × D` |
| `week_left > LT + D − 4` | Sufficient stock, no order needed | `0` |

Simplified:
```
no_order_threshold = LT + D − 4
QTY = week_left > no_order_threshold ? 0 : AVG × D
```

### Step 4 — Projected SOH
Stock level at Week LT (when the new order arrives):
```
Projected_SOH = bare_soh + QTY
              = max(0, SOH + OO − AVG × LT) + QTY
```

### Stockout During Lead Time
Red flag — current stock will run out before the order arrives:
```
stockout_during_lt = (SOH + OO) < (AVG × LT)
                   ≡ week_left < LT
```

### Example (LT=12, D=12, AVG=105, SOH=200, OO=150)
```
week_left  = (200 + 150) / 105 = 3.3 weeks   → will stock out
bare_soh   = max(0, 350 − 105×12) = 0
QTY        = 3.3 < 20 → 105 × 12 = 1260
Projected  = 0 + 1260 = 1260  ✓
```

---

## Input

### Excel File Columns (uploaded by user)
| Column | Field | Type | Description |
|--------|-------|------|-------------|
| A | sku_code | String | Unique product code |
| B | category | String | 3-level hierarchy, e.g. `Electronics > Phones > iPhone` |
| C | product_name | String | Product name |
| D | attribute | String | Variant info (color, size, etc.) |
| E | avg_weekly_sales | Number | Pre-calculated 12-week average weekly sales |
| F | stock_on_hand | Number | Current warehouse inventory |
| G | on_order | Number | Quantity already ordered, in transit |

### Global Parameters (entered in UI, default both 12)
| Parameter | Field | Default | Description |
|-----------|-------|---------|-------------|
| Lead Time | LT | 12 weeks | Order → production → shipping → warehouse arrival |
| Demand Factor | D | 12 weeks | Weeks of supply to order per purchase order |

---

## Output Table Columns

| Col | Label | Source | Editable |
|-----|-------|--------|----------|
| A | SKU Code / Mã hàng | Input | No |
| B | Category / Nhóm hàng | Input | No |
| C | Product Name / Tên hàng | Input | No |
| D | Attribute / Thuộc tính | Input | No |
| E | AVG | Input | **Yes** |
| F | SOH | Input | **Yes** |
| G | OO | Input | **Yes** |
| H | Week Left | Calculated | No |
| I | Bare SOH | Calculated | No |
| J | QTY | Calculated | No |
| K | Projected SOH | Calculated | No |

---

## Row Color Coding

| Color | Condition | Meaning |
|-------|-----------|---------|
| 🔴 Red | `week_left < LT` i.e. `SOH + OO < AVG × LT` | Will stock out before new order arrives |
| 🟡 Yellow | `QTY > 0` | Needs ordering |
| ⬜ White | `QTY = 0` | Sufficient stock, no order needed |

---

## Key Types

```typescript
interface GlobalParams {
  lt: number; // Lead Time in weeks (default 12)
  d: number;  // Demand Factor — weeks of supply to order (default 12)
}

interface SKURow {
  id: string;
  sku_code: string;
  category: string;
  product_name: string;
  attribute: string;
  avg: number;               // editable
  soh: number;               // editable
  oo: number;                // editable
  week_left: number;         // calculated: (SOH + OO) / AVG
  bare_soh: number;          // calculated: max(0, SOH + OO − AVG × LT)
  qty: number;               // calculated
  projected_soh: number;     // calculated: bare_soh + qty
  stockout_during_lt: boolean; // week_left < LT
}
```

---

## Calculation Functions

```typescript
function calcWeekLeft(avg: number, soh: number, oo: number): number {
  return avg > 0 ? (soh + oo) / avg : Infinity;
}

function calcBareSoh(avg: number, lt: number, soh: number, oo: number): number {
  return Math.max(0, soh + oo - avg * lt);
}

function calcQTY(avg: number, lt: number, d: number, soh: number, oo: number): number {
  const weekLeft = calcWeekLeft(avg, soh, oo);
  const noOrderThreshold = lt + Math.max(0, d - 4);
  return weekLeft > noOrderThreshold ? 0 : avg * d;
}

function calcProjectedSOH(avg: number, lt: number, soh: number, oo: number, qty: number): number {
  return calcBareSoh(avg, lt, soh, oo) + qty;
}
```
