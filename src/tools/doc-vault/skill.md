# Quy ước đặt tên tài liệu — Doc Vault

## Định dạng chuẩn

```
[DEPT]-[LOAI]-[YYYYMM]-[TenTaiLieu]-v[X.Y].[ext]
```

## Mã phòng ban (DEPT)

| Mã    | Phòng ban             |
|-------|-----------------------|
| MKT   | Marketing             |
| HR    | Nhân sự               |
| FIN   | Tài chính             |
| OPS   | Vận hành              |
| IT    | Công nghệ thông tin   |
| SALE  | Kinh doanh            |
| PRD   | Sản phẩm              |
| GEN   | Chung (toàn công ty)  |

## Mã loại tài liệu (LOAI)

| Mã    | Loại                                 |
|-------|--------------------------------------|
| SOP   | Quy trình chuẩn (Standard Operating Procedure) |
| POL   | Chính sách (Policy)                  |
| MAN   | Hướng dẫn (Manual / Guide)           |
| FORM  | Biểu mẫu (Form / Template)          |
| RPT   | Báo cáo (Report)                     |
| CTR   | Hợp đồng (Contract)                  |
| OTH   | Khác (Other)                         |

## Quy tắc phiên bản (vX.Y)

- **Major (X)**: Tăng khi có thay đổi lớn về nội dung hoặc cấu trúc tài liệu
- **Minor (Y)**: Tăng khi chỉnh sửa nhỏ, bổ sung thông tin, sửa lỗi chính tả
- Phiên bản đầu tiên luôn là `v1.0`
- Sau thay đổi lớn: `v1.x → v2.0` (reset Minor về 0)
- Sau chỉnh sửa nhỏ: `v1.0 → v1.1`

## Quy tắc TenTaiLieu

- Viết PascalCase (viết hoa chữ đầu mỗi từ)
- Không có dấu cách, không có ký tự đặc biệt
- Chỉ dùng ký tự ASCII (`[A-Za-z0-9]`)
- Tiếng Việt cần được chuyển đổi (bỏ dấu, `đ → d`)

## Ví dụ hợp lệ

```
HR-SOP-202601-QuiTrinhOnboarding-v1.0.docx
FIN-RPT-202604-BaoCaoQuiI2026-v1.0.xlsx
GEN-POL-202601-NoiQuyLamViec-v2.1.docx
IT-MAN-202603-HuongDanCaiDatHeThong-v1.1.docx
MKT-FORM-202602-BienBanNghiemThu-v1.0.xlsx
SALE-CTR-202601-HopDongDaiLy-v3.0.docx
```

## Lỗi thường gặp

| Sai                                          | Đúng                                        |
|----------------------------------------------|---------------------------------------------|
| `HR_SOP_202601_QuiTrinh_v1.0.docx`           | `HR-SOP-202601-QuiTrinh-v1.0.docx`          |
| `HR-SOP-2026-QuiTrinh-v1.0.docx`             | `HR-SOP-202601-QuiTrinh-v1.0.docx`          |
| `HR-SOP-202601-Quy Trinh-v1.0.docx`          | `HR-SOP-202601-QuyTrinh-v1.0.docx`          |
| `HR-SOP-202601-QuyTrình-v1.0.docx`           | `HR-SOP-202601-QuyTrinh-v1.0.docx`          |
| `HR-SOP-202601-QuiTrinh-1.0.docx`            | `HR-SOP-202601-QuiTrinh-v1.0.docx`          |
| `HR-SOP-202613-QuiTrinh-v1.0.docx`           | Tháng 13 không hợp lệ                       |

## Validation Regex

```
/^(MKT|HR|FIN|OPS|IT|SALE|PRD|GEN)-(SOP|POL|MAN|FORM|RPT|CTR|OTH)-(\d{6})-([A-Za-z0-9]+)-v(\d+)\.(\d+)\.(docx|xlsx)$/
```
