# Contract Generator Tool — CLAUDE.md

## What This Tool Does
Generates Vietnamese contracts (Hợp Đồng) and acceptance reports (Biên Bản Nghiệm Thu) for Leonardo company. User selects a contract type, fills one form, and downloads both documents as `.docx` files — fully client-side.

## Contract Types
3 types, each producing 2 documents (HD + BBNT):

| Type | HD file | BBNT file | Bên B role |
|---|---|---|---|
| **Photographer** | `Template Photographer Contract/HD Photo.docx` | `Template Photographer Contract/BBNT Photo.docx` | PHOTOGRAPHER |
| **Stylist** | `Template Stylist Contract/HD- Stylist.docx` | `Template Stylist Contract/BBNT Stylist.docx` | STYLIST |
| **Ecom** | `Template Ecom Contract/HD Ecom.docx` | `Template Ecom Contract/BBNT Ecom.docx` | PHOTOGRAPHER |

## Technical Approach
- **Template engine:** `docxtemplater` + `pizzip` — inject `{{placeholder}}` into DOCX files
- **Download:** `file-saver`
- **Template files:** Must be copied to `public/templates/` so the browser can `fetch()` them
- **IMPORTANT:** The current template files still contain real example data — they need `{{placeholders}}` injected via a Python script before the tool can work

## Placeholder Strategy

### Common Placeholders (all 6 docs)
| Placeholder | Source | Notes |
|---|---|---|
| `{{so_hop_dong}}` | User input | e.g. "0303/2026/TB-LEO" |
| `{{ngay}}` `{{thang}}` `{{nam}}` | User input (date picker) | split from single date |
| `{{ho_ten}}` | User input | uppercase |
| `{{cccd}}` | User input | |
| `{{ngay_cap}}` | User input | |
| `{{noi_cap}}` | User input | |
| `{{dia_chi}}` | User input | |
| `{{dien_thoai}}` | User input | |
| `{{email}}` | User input | |
| `{{ten_tai_khoan}}` | User input | |
| `{{so_tai_khoan}}` | User input | |
| `{{ngan_hang}}` | User input | |
| `{{tong_gia_tri}}` | Calculated or input | formatted: "3.200.000" |
| `{{tong_gia_tri_chu}}` | Auto-calculated | Vietnamese words |
| `{{thue_tncn}}` | Auto-calculated | 10% of total |
| `{{thuc_nhan}}` | Auto-calculated | total - tax |

### BBNT-only Placeholders
| Placeholder | Notes |
|---|---|
| `{{so_bbnt}}` | e.g. "0303/BBNTLEONARDO-2026" |
| `{{ngay_bbnt}}` `{{thang_bbnt}}` `{{nam_bbnt}}` | BBNT date (often same as HD) |

### Type-Specific Placeholders

**Photographer:**
- HD: no extra fields (pricing table is fixed text, only total varies)
- BBNT: `{{noi_dung_nghiem_thu}}` — free-text description of work done (release, retouch details)

**Stylist:**
- HD + BBNT: `{{so_look_outdoor}}`, `{{tong_outdoor}}`, `{{so_look_indoor}}`, `{{tong_indoor}}`
- Fixed rates: Outdoor = 880,000 VNĐ/look, Indoor = 660,000 VNĐ/look
- Total auto-calculated from looks

**Ecom:**
- HD + BBNT: `{{so_tam}}` (number of photos)
- Fixed rate: 60,000 VNĐ/tấm
- Total auto-calculated: `{{so_tam}}` × 60,000

## Fixed Data (Bên A — never changes)
- Công ty: CÔNG TY TNHH LEONARDO
- Địa chỉ: 284 Pasteur, Phường Xuân Hoà, TPHCM
- Đại diện: Ông ĐẶNG VĂN PHÚ — Giám đốc
- MST: 0314465951

## Planned File Structure
```
src/tools/contract-generator/
  index.tsx                    ← Main component (type selector + form + download)
  types.ts                     ← TypeScript types for form data
  CLAUDE.md
  Template */                  ← Original .docx files (reference only)
  utils/
    numberToWords.ts           ← Convert number → Vietnamese words
    formatters.ts              ← Currency, date formatters
    fillTemplate.ts            ← docxtemplater wrapper (fetch → fill → save)
  generators/
    buildPhotoData.ts          ← Build placeholder map for Photographer
    buildStylistData.ts        ← Build placeholder map for Stylist
    buildEcomData.ts           ← Build placeholder map for Ecom

public/templates/              ← Placeholder-injected .docx files (browser-fetchable)
  HD_Photo.docx
  BBNT_Photo.docx
  HD_Stylist.docx
  BBNT_Stylist.docx
  HD_Ecom.docx
  BBNT_Ecom.docx
```

## UI Flow
1. **Type Selector** — 3 cards: Photographer / Stylist / Ecom
2. **Form** — sections:
   - Thông tin Bên B (name, CCCD, address, phone, email)
   - Thông tin Hợp Đồng (date, contract number)
   - Thanh toán (bank info + type-specific pricing fields)
   - Thông tin BBNT (BBNT date, number, + type-specific content)
3. **Download** — two buttons: "Tải HD (.docx)" and "Tải BBNT (.docx)"

## Dependencies to Install
```bash
npm install docxtemplater pizzip file-saver
npm install -D @types/file-saver
```

## Pre-Build Step Required
Before coding the React component, run a Python script to inject `{{placeholders}}` into the 6 DOCX template files and copy them to `public/templates/`. The script uses `python-docx` to find-and-replace the real data with placeholder syntax while preserving formatting.

## Contract Number Format
- HD Photo/Stylist: `MMDD/YYYY/TB-LEO` (e.g. "0303/2026/TB-LEO")
- HD Ecom: `MMDD/HĐLEONARDO-YYYY` (e.g. "0202/HĐLEONARDO-2026")
- BBNT all types: `MMDD/BBNTLEONARDO-YYYY` (e.g. "0303/BBNTLEONARDO-2026")
- Auto-suggest from date, but user can override
