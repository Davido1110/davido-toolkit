# Suggestion Tool — Payroll Parameter Optimizer
> Spec version: suggestion_tool_v1 (17/03/2026)
> Parent spec: payroll_logic_spec_v2 (CLAUDE.md)

---

## Tổng quan

Tool này là **bộ gợi ý tham số lương** — giúp người dùng tìm ra bộ số cấu hình hợp lý (Lương HĐLĐ, Phụ cấp, Hoa hồng, OT) để đạt mức **Thu Nhập Nội bộ (TN_NB)** mục tiêu trong 3 kịch bản: **Thấp / Trung bình / Cao**.

Khác với Pay-slip Tool (tính lương từ cấu hình đã có), Suggestion Tool chạy theo hướng ngược: **cho trước TN_NB → tìm bộ số phù hợp**.

**Platform:** React Web App, no backend, no history. Toàn bộ logic chạy client-side.

---

## Nguyên tắc cốt lõi

Mọi bộ số được gợi ý phải thỏa mãn ràng buộc từ CLAUDE.md:

```
S − Deduction + OT_Amount + PC + HH − BHXH = TN_NB
```

Trong đó:
- `Deduction = 0` (giả định nhân viên đi làm đủ — không nghỉ không lương)
- `BHXH = S × 10.5%`
- `OT_Amount = Hourly_Rate × (1.5×OT1 + 2.0×OT2 + 3.0×OT3)`
- `HH = Tỷ_lệ_HH × Doanh_thu` (nếu có hoa hồng)

Khi tất cả slider điều chỉnh xong, đẳng thức trên phải luôn = TN_NB. Nếu lệch → hiển thị delta cảnh báo rõ ràng theo thời gian thực.

---

## Luồng sử dụng (User Flow)

```
Bước 1: Nhập danh sách nhân viên (Employee List)
         ↓
Bước 2: Nhập 3 mức TN_NB cho từng nhân viên (Thấp / TB / Cao)
         ↓
Bước 3: Nhập thông tin tháng (tháng/năm, R1, R2)
         ↓
Bước 4: Nhấn "Tính toán & Gợi ý"
         ↓
Bước 5: Xem kết quả gợi ý theo từng kịch bản
         ↓
Bước 6: Điều chỉnh slider để tinh chỉnh → kết quả cập nhật real-time
```

---

## Input

### 1. Danh sách nhân viên

Nhập thủ công hoặc upload Excel. Mỗi nhân viên gồm:

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | string | Mã NV |
| `name` | string | Họ tên |
| `entity` | `'Cty'` \| `'HKD'` | Pháp nhân |
| `hasCommission` | boolean | Có hoa hồng không |
| `revenueSource` | `'R1'` \| `'R2'` | Nguồn doanh thu (nếu có HH) |

> **Lưu ý:** Các trường `baseSalary`, `allowance`, `commissionRate` **không nhập ở đây** — đây là output mà tool sẽ gợi ý.

### 2. Thu nhập nội bộ theo 3 kịch bản

Với mỗi nhân viên, nhập 3 mức TN_NB:

| Kịch bản | Ký hiệu | Ví dụ |
|----------|---------|-------|
| Thấp | `TN_NB_low` | 15,000,000 |
| Trung bình | `TN_NB_mid` | 25,000,000 |
| Cao | `TN_NB_high` | 40,000,000 |

### 3. Thông tin tháng

| Trường | Mô tả |
|--------|-------|
| `month` | Tháng/năm (e.g. `03/2026`) → dùng để tính `Ds` tự động (Thứ 2–Thứ 6) |
| `r1` | Doanh thu Cty (VNĐ) |
| `r2` | Doanh thu HKD (VNĐ) |

---

## Calculation Logic (Gợi ý tham số)

Tool chạy thuật toán gợi ý theo thứ tự ưu tiên sau cho từng kịch bản TN_NB:

### Bước A — Xác định khoảng S hợp lý
- Gợi ý `S` theo dải: `[TN_NB × 30%, TN_NB × 80%]`
- Làm tròn đến bội số 500,000
- Mặc định slider khởi tạo tại `TN_NB × 50%`

### Bước B — Xác định PC
- 3 mức cố định: **1,000,000 / 2,000,000 / 5,000,000**
- Tool gợi ý mức phù hợp dựa trên TN_NB:
  - TN_NB < 15M → PC = 1,000,000
  - 15M ≤ TN_NB < 30M → PC = 2,000,000
  - TN_NB ≥ 30M → PC = 5,000,000

### Bước C — Xác định HH (nếu `hasCommission = true`)
- Tính `HH = Tỷ_lệ_HH × Doanh_thu`
- Slider `Tỷ_lệ_HH` từ `0%` đến `20%`, bước 0.5%
- Tool gợi ý `Tỷ_lệ_HH` mặc định sao cho HH ≈ `TN_NB × 30%`

### Bước D — Tính Gap và OT
```
Gap = TN_NB − S − PC − HH + BHXH
```
- Nếu `Gap > 0`: Tính giờ OT gợi ý
  - `OT1_suggested = Gap / (Hourly_Rate × 1.5)`
  - Nếu `OT1_suggested > 72h` → cảnh báo đỏ, gợi ý tăng S hoặc HH
- Nếu `Gap < 0`: Gợi ý tăng S hoặc tăng PC
- Nếu `Gap = 0`: Trạng thái lý tưởng, không cần OT

### Bước E — Xác nhận ràng buộc
```
S − Deduction + OT_Amount + PC + HH − BHXH === TN_NB ?
```
- Đúng → Hiển thị ✅
- Sai (delta ≠ 0) → Hiển thị delta theo màu cảnh báo

---

## Output — Slider Interface

### Cấu trúc layout
- Mỗi nhân viên = 1 card riêng
- Mỗi card có **3 tab kịch bản**: `Thấp | Trung bình | Cao`
- Trong mỗi tab kịch bản: hiển thị bộ slider + kết quả real-time

### Các slider trong mỗi kịch bản

| Slider | Min | Max | Bước | Đơn vị |
|--------|-----|-----|------|--------|
| **Lương HĐLĐ (S)** | 3,000,000 | TN_NB × 90% | 500,000 | VNĐ |
| **Phụ cấp (PC)** | 0 | 5,000,000 | 1,000,000* | VNĐ |
| **Tỷ lệ HH** | 0% | 20% | 0.5% | % (chỉ hiện khi hasCommission = true) |
| **Giờ OT thường (OT1)** | 0 | 100 | 1 | giờ |
| **Giờ OT cuối tuần (OT2)** | 0 | 80 | 1 | giờ |
| **Giờ OT lễ (OT3)** | 0 | 50 | 1 | giờ |

> *PC chỉ có 3 giá trị hợp lệ: 1,000,000 / 2,000,000 / 5,000,000 — dùng dạng toggle button, không phải slider liên tục.

### Panel kết quả real-time (cập nhật ngay khi slider thay đổi)

```
┌─────────────────────────────────────────────────┐
│  Kịch bản: TRUNG BÌNH — TN_NB = 25,000,000     │
├─────────────────────────────────────────────────┤
│  Lương HĐLĐ (S)        :  12,000,000            │
│  Phụ cấp (PC)          :   2,000,000            │
│  Hoa hồng (HH)         :   5,000,000            │
│  BHXH (−)              :  −1,260,000            │
│  OT Amount             :   7,260,000            │
│  ─────────────────────────────────────────────  │
│  Tổng TN tính được     :  25,000,000            │
│  TN_NB mục tiêu        :  25,000,000            │
│  Delta                 :           0  ✅        │
│  ─────────────────────────────────────────────  │
│  Giờ OT tương ứng      :  101.6h/tháng 🛑       │
│  Cảnh báo              :  OT > 72h — Xem lại S  │
└─────────────────────────────────────────────────┘
```

### Màu sắc trạng thái

| Trạng thái | Màu | Điều kiện |
|------------|-----|-----------|
| ✅ Cân bằng | Xanh lá | Delta = 0 |
| ⚠ Lệch nhỏ | Vàng | 0 < \|Delta\| ≤ 50,000 |
| 🛑 Lệch lớn | Đỏ | \|Delta\| > 50,000 |
| ⚠ OT cao | Vàng | 40 < OT_total ≤ 72h |
| 🛑 OT nguy hiểm | Đỏ | OT_total > 72h |

---

## UI Structure

### Tab 1: Nhập liệu (Input)
- Form nhập danh sách nhân viên (hoặc upload Excel)
- Nhập TN_NB × 3 kịch bản cho từng người
- Nhập tháng, R1, R2
- Nút "Tính toán & Gợi ý"

### Tab 2: Gợi ý & Điều chỉnh (Suggestion & Tuning) ← Tab chính
- Mỗi nhân viên = 1 card
- Tabs kịch bản: Thấp / Trung bình / Cao
- Slider + panel kết quả real-time
- Badge cảnh báo nổi bật

### Tab 3: Tổng hợp (Summary)
- Bảng tóm tắt toàn bộ nhân viên × 3 kịch bản
- Cột: Tên NV | TN_NB Thấp | Bộ số | TN_NB TB | Bộ số | TN_NB Cao | Bộ số
- Nút "Copy sang Pay-slip Tool" (export ra Excel định dạng Master Data)

---

## Edge Cases & Validation

| Điều kiện | Xử lý |
|-----------|-------|
| `TN_NB_low > TN_NB_mid` | Cảnh báo — yêu cầu nhập lại |
| `TN_NB_mid > TN_NB_high` | Cảnh báo — yêu cầu nhập lại |
| `HH > TN_NB` | Hiển thị lỗi đỏ trên slider HH |
| OT > 72h | Cảnh báo đỏ, gợi ý tăng S |
| `S < lương tối thiểu vùng` | Cảnh báo (tùy chọn, có thể cấu hình) |
| Gap < 0 sau khi điều chỉnh | Hiển thị "Nghỉ không lương dự kiến: X ngày" thay vì OT |

---

## Liên kết với Pay-slip Tool

Suggestion Tool là bước trước Pay-slip Tool trong quy trình:

```
Suggestion Tool          →        Pay-slip Tool
(Tìm bộ số phù hợp)             (Tính bảng lương thuế chính thức)
        ↓
Export → Master Data Excel
        ↓
Import vào Pay-slip Tool (Tab Master Data)
```

Output export của Suggestion Tool phải tương thích định dạng import của Pay-slip Tool:
`Mã NV | Họ tên | Pháp nhân | Lương HĐLĐ | Phụ cấp | Có HH | Tỷ lệ HH | Nguồn DT`

---

## Libraries

- **React** — UI framework, `useState` / `useReducer` cho slider state
- **Tailwind CSS** — Styling, dark mode support
- **SheetJS (xlsx)** — Import/Export Excel
- **No external state management** — toàn bộ chạy client-side

---

## Worked Example

**Nhân viên:** Nguyễn Văn A | Cty | Có HH | R1

**Tháng 3/2026:** Ds = 21 ngày | R1 = 500,000,000

**3 kịch bản TN_NB:**
- Thấp: 20,000,000
- Trung bình: 35,000,000
- Cao: 55,000,000

**Kịch bản Trung bình (TN_NB = 35,000,000) — Gợi ý ban đầu:**
```
S          = 35M × 50% = 17,500,000  → làm tròn = 17,500,000
PC         = 2,000,000  (TN_NB 15M–30M... nhưng ở đây > 30M → PC = 5,000,000)
             → Tool gợi ý PC = 5,000,000
HH_rate    = gợi ý để HH ≈ 35M × 30% = 10.5M
             → HH_rate = 10.5M / 500M = 2.1% → làm tròn 2.0%
HH         = 2% × 500M = 10,000,000
BHXH       = 17,500,000 × 10.5% = 1,837,500
Gap        = 35M − 17.5M − 5M − 10M + 1,837,500 = 4,337,500
Hourly     = 17,500,000 / (21 × 8) = 104,167
OT1        = 4,337,500 / (104,167 × 1.5) = 27.8h  ✅ < 40h

Kiểm tra:  17,500,000 + 4,337,500 + 5,000,000 + 10,000,000 − 1,837,500 = 35,000,000 ✅
```

Người dùng có thể kéo slider S, HH_rate hoặc PC để thay đổi → các giá trị còn lại cập nhật ngay lập tức.
