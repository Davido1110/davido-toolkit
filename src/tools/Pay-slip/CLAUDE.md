# Pay-slip Tool — CLAUDE.md
> Spec version: payroll_logic_spec_v2 (16/03/2026)

## Overview
Tool tính toán bảng lương thuế cho 2 pháp nhân: **Công ty TNHH Leonardo (Cty)** và **Hộ kinh doanh Lê Khắc Thông (HKD)**.

**Nguyên tắc cốt lõi — Reverse Engineering:**
Xuất phát từ **Thu Nhập Nội bộ (TN_NB)** đã định trước, hệ thống tính ngược ra các thành phần lương để đảm bảo bảng lương luôn cân bằng.

**Ràng buộc bắt buộc:**
```
S − Deduction + OT_Amount + PC + HH − BHXH = TN_NB
```
Phương trình này phải luôn đúng sau khi tính lương. Nếu sai → lỗi, không cho xuất.

Platform: React Web App, no backend, no history — tính xong export Excel.

---

## Folder Structure
```
src/tools/Pay-slip/
├── CLAUDE.md
├── index.tsx               ← default export (root component)
├── types.ts                ← all TypeScript types/interfaces
├── constants.ts            ← default config values
├── logic/
│   └── payroll.ts          ← pure calculation functions (no UI)
├── components/
│   ├── MasterDataTab.tsx
│   ├── MonthlyInputTab.tsx
│   ├── PayrollResultTab.tsx
│   ├── AuditingTab.tsx
│   ├── GuideTab.tsx
│   └── ExportTab.tsx
└── utils/
    ├── excelImport.ts      ← Excel import (SheetJS)
    └── excelExport.ts      ← Excel export (SheetJS)
```

---

## Variables (Biến số)

| Biến | Tên đầy đủ | Mô tả / Nguồn |
|------|-----------|--------------|
| `TN_NB` | Thu Nhập Nội bộ | Mức lương thực nhận mục tiêu — nhập mỗi tháng |
| `S` | Lương HĐLĐ (Lương cứng) | Lương hợp đồng lao động, cố định — Master Data |
| `Ds` | Số ngày công chuẩn | **Tự động đếm Thứ 2–Thứ 6** trong tháng được chọn (không dùng hằng số cố định) |
| `H` | Số giờ/ngày | Mặc định = 8 giờ |
| `Du` | Ngày nghỉ không lương | Tính khi Gap < 0 |
| `OT1` | Giờ OT ngày thường | Hệ số 1.5x |
| `OT2` | Giờ OT cuối tuần | Hệ số 2.0x |
| `OT3` | Giờ OT lễ/tết | Hệ số 3.0x |
| `PC` | Phụ cấp | Khoản phụ cấp cố định — Master Data |
| `HH` | Hoa Hồng | `Tỷ_lệ_HH × R1` (Cty) hoặc `× R2` (HKD). = 0 nếu không có HH |
| `BHXH` | Bảo hiểm xã hội | `S × 10.5%` — phần người lao động đóng |

---

## Calculation Logic (`logic/payroll.ts`)

### Công thức nền

```
Hourly_Rate  = S / (Ds × H)
Deduction    = (S / Ds) × Du          // chỉ khi Gap < 0
OT_Amount    = Hourly_Rate × (1.5×OT1 + 2.0×OT2 + 3.0×OT3)
BHXH         = S × 10.5%
HH           = Tỷ_lệ_HH × Doanh_thu  // R1 (Cty) hoặc R2 (HKD)
```

### 4 bước tính lương

**Bước 1 — Tính các thành phần cố định**
```
BHXH = S × 10.5%
HH   = Tỷ_lệ_HH × Doanh_thu   (hoặc 0 nếu không có HH)
PC   = phụ cấp cố định từ Master Data
```

**Bước 2 — Tính Chênh lệch (Gap)**
```
Gap = TN_NB − S − PC − HH + BHXH
```
> Lưu ý: BHXH **cộng** vào (không trừ) vì trong ràng buộc gốc BHXH đã bị trừ. Khi chuyển vế tìm OT, đổi dấu thành cộng.
> Chứng minh: TN_NB = S + OT_Amount + PC + HH − BHXH  →  OT_Amount = TN_NB − S − PC − HH + BHXH

**Bước 3 — Phân bổ Gap**

| Điều kiện | Ý nghĩa | Xử lý |
|-----------|---------|-------|
| `Gap > 0` | Có OT trong tháng | Tính ngược giờ OT: `OT1 = Gap / (Hourly_Rate × 1.5)` (mặc định phân bổ vào OT1; có thể chỉnh tay OT2/OT3) |
| `Gap < 0` | Nghỉ không lương | Tính ngày nghỉ: `Du = |Gap| / (S / Ds)`. OT1 = OT2 = OT3 = 0 |
| `Gap = 0` | Không OT, không nghỉ | Du = 0, OT = 0 |

**Bước 4 — Xác nhận ràng buộc**
```
S − Deduction + OT_Amount + PC + HH − BHXH === TN_NB  ?
```
- Đúng → xuất bảng lương
- Sai → cảnh báo lỗi, không cho xuất

---

## Data Structures (`types.ts`)

### Employee (Master Data — configured once)
```ts
interface Employee {
  id: string;              // Mã NV, e.g. "NV001"
  name: string;            // Họ tên
  entity: 'Cty' | 'HKD';
  baseSalary: number;      // Lương HĐLĐ (S) — VNĐ
  allowance: number;       // Phụ cấp cố định (PC)
  hasCommission: boolean;
  commissionRate: number;  // % (0 nếu không có HH)
  revenueSource: 'R1' | 'R2'; // nguồn doanh thu cho HH
}
```

### Monthly Input
```ts
interface MonthlyInput {
  month: string;           // "03/2026"
  r1: number;              // Doanh thu Cty
  r2: number;              // Doanh thu HKD
  internalIncome: { employeeId: string; amount: number }[];
}
```

### Payroll Result (per employee)
```ts
interface PayrollRow {
  employeeId: string;
  name: string;
  entity: 'Cty' | 'HKD';
  baseSalary: number;      // S
  workingDays: number;     // Ds — auto-calculated
  unpaidLeaveDays: number; // Du (khi Gap < 0)
  deduction: number;       // S/Ds × Du
  otHours1: number;        // OT ngày thường (1.5x)
  otHours2: number;        // OT cuối tuần (2.0x)
  otHours3: number;        // OT lễ/tết (3.0x)
  otAmount: number;        // tổng tiền OT
  allowance: number;       // PC
  commission: number;      // HH
  bhxh: number;            // S × 10.5%
  totalIncome: number;     // must equal TN_NB ✔
  warnings: Warning[];
}
```

---

## Default Constants (`constants.ts`)

| Constant | Default | Note |
|----------|---------|------|
| `WORKING_HOURS` | 8 | Số giờ/ngày |
| `OT_MULTIPLIER_1` | 1.5 | OT ngày thường |
| `OT_MULTIPLIER_2` | 2.0 | OT cuối tuần |
| `OT_MULTIPLIER_3` | 3.0 | OT lễ/tết |
| `BHXH_RATE` | 0.105 | 10.5% — phần NLĐ đóng |
| `OT_WARNING_YELLOW` | 40 | Giờ OT/tháng |
| `OT_WARNING_RED` | 72 | Giờ OT/tháng |

> **Ds (số ngày công chuẩn) KHÔNG còn là hằng số cố định.** Hệ thống tự đếm số ngày Thứ 2–Thứ 6 trong tháng được chọn.

---

## Working Day Calculation (Ds)

```ts
function countWorkingDays(month: number, year: number): number {
  // Đếm số ngày Thứ 2 (1) đến Thứ 6 (5) trong tháng
  // Không tính Thứ 7 (6), Chủ nhật (0)
  // Ngày lễ: có thể cấu hình riêng (optional)
}
```

---

## Edge Cases & Warnings

| Condition | Type |
|-----------|------|
| OT giờ > 40h/tháng | ⚠ Warning (yellow) |
| OT giờ > 72h/tháng | 🛑 Danger (red) |
| Gap < 0 → Du > Ds | 🛑 Error — không thể nghỉ nhiều hơn ngày công chuẩn |
| TN_NB === 0 | ⚠ Warning |
| Nhân viên trong Master nhưng không có TN_NB | ⚠ Warning |
| Ràng buộc không cân bằng sau tính toán | 🛑 Error — không cho xuất |
| HH > TN_NB | 🛑 Error |

---

## UI Structure — 5 Tabs

### Tab 1: Master Data
- Bảng nhân sự với inline edit
- Add / Edit / Delete employee
- Upload Excel (columns: Mã NV, Họ tên, Pháp nhân, Lương HĐLĐ, Phụ cấp, Có HH, Tỷ lệ HH, Nguồn DT)
- Filter: All / Cty / HKD
- Data lưu `localStorage`

### Tab 2: Monthly Input
- Chọn tháng → hệ thống tự tính Ds
- Nhập R1 (Doanh thu Cty), R2 (Doanh thu HKD)
- Bảng nhập TN_NB từng nhân sự (manual hoặc upload Excel)
- Nút "Tính toán" → chạy 4-bước

### Tab 3: Payroll Result (Bảng Lương Thuế)
- 2 sub-table: Cty | HKD
- Columns: Mã NV, Họ tên, Lương HĐLĐ, Trừ nghỉ, Giờ OT (1/2/3), Tiền OT, Phụ cấp, Hoa hồng, BHXH, Tổng TN, Cảnh báo
- Highlight cảnh báo: vàng / đỏ
- Reconciliation: Sum(Cty) + Sum(HKD) vs Tổng TN_NB

### Tab 4: Auditing
- Kiểm tra ràng buộc từng nhân sự
- Chi tiết từng bước tính

### Tab 5: Export
- Export Cty → `.xlsx`
- Export HKD → `.xlsx`
- Export reconciliation → `.xlsx`

---

## Libraries
- **SheetJS (xlsx)** — Excel import/export
- **Tailwind CSS** — styling với `dark:` variants
- No external state management — `useState` / `useReducer` + `localStorage`

---

## Worked Examples

### Example 1 — Nhân viên Cty có HH, Gap > 0 (OT)
- S = 10,000,000 | R1 = 500,000,000 | TN_NB = 51,000,000 | PC = 1,000,000 | HH_rate = 5%
- Tháng có Ds = 21 ngày (ví dụ tháng 3/2026)
- BHXH = 10,000,000 × 10.5% = 1,050,000
- HH = 5% × 500,000,000 = 25,000,000
- Gap = 51,000,000 − 10,000,000 − 1,000,000 − 25,000,000 + 1,050,000 = **16,050,000**
- Hourly_Rate = 10,000,000 / (21 × 8) = 59,524
- OT1 = 16,050,000 / (59,524 × 1.5) = 179.6h
- OT_Amount = 179.6 × 59,524 × 1.5 = 16,050,000
- **Check: 10,000,000 + 16,050,000 + 1,000,000 + 25,000,000 − 1,050,000 = 51,000,000 ✔**

### Example 2 — Nhân viên HKD không HH, Gap < 0 (nghỉ không lương)
- S = 8,000,000 | TN_NB = 7,000,000 | PC = 1,000,000 | HH = 0
- Ds = 21 | BHXH = 8,000,000 × 10.5% = 840,000
- Gap = 7,000,000 − 8,000,000 − 1,000,000 − 0 + 840,000 = **−1,160,000**
- Du = 1,160,000 / (8,000,000/21) = 3.045 ngày nghỉ
- Deduction = (8,000,000/21) × 3.045 = 1,160,000
- **Check: 8,000,000 − 1,160,000 + 0 + 1,000,000 + 0 − 840,000 = 7,000,000 ✔**

---

## Changes from v1 → v2

| Thay đổi | v1 | v2 |
|----------|----|----|
| BHXH | Phase 2 (out of scope) | **IN SCOPE** — `S × 10.5%` |
| Gap formula | `TN_NB − S − PC − HH` | `TN_NB − S − PC − HH + BHXH` |
| Gap < 0 | Không xử lý | Tính ngày nghỉ Du |
| Số ngày công (Ds) | Hằng số 26 | **Auto-calculate** Thứ 2–Thứ 6 theo tháng |
| OT types | OT1 (1.5x) only | OT1 (1.5x) + OT2 (2.0x) + OT3 (3.0x) |
| Làm tròn OT | Round 0.5h, dư vào allowance | OT_Amount = Gap chính xác (không làm tròn vào PC) |
| Ràng buộc | `grossSalary + allowance + commission = TN_NB` | `S − Deduction + OT + PC + HH − BHXH = TN_NB` |
