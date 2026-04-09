# Doc Vault — CLAUDE.md

## Mục đích

Tool quản lý vòng đời tài liệu nội bộ (docx, xlsx). Hỗ trợ tạo, duyệt, phân quyền, lưu trữ và hủy tài liệu với phân quyền per-document.

## Stack

- React + TypeScript
- Firebase Firestore (metadata + ACL)
- Firebase Storage (file blobs)
- TailwindCSS dark mode

## Cấu trúc thư mục

```
src/tools/doc-vault/
├── CLAUDE.md          ← file này
├── skill.md           ← quy ước đặt tên (nguồn tham chiếu cho NamingGuide)
├── index.tsx          ← root component, 5 tab: library/upload/approvals/bundles/guide
├── types.ts           ← tất cả TypeScript interfaces và const arrays
├── hooks/
│   ├── useDocuments.ts     ← Firestore query + ACL filter phía client
│   ├── useFileUpload.ts    ← Firebase Storage upload với progress
│   └── usePermission.ts    ← trả về { canView, canEdit, canApprove, canDelete, canAcknowledge }
├── components/
│   ├── StatusBadge.tsx          ← pill badge màu theo trạng thái
│   ├── DocumentLibrary.tsx      ← danh sách tài liệu, filter, card/table view
│   ├── UploadWizard.tsx         ← wizard 3 bước: file+tên → metadata → ACL
│   ├── DocumentDetail.tsx       ← chi tiết tài liệu, lifecycle buttons, xác nhận
│   ├── VersionHistory.tsx       ← lịch sử phiên bản (con của DocumentDetail)
│   ├── ChangeRequestPanel.tsx   ← gửi/duyệt yêu cầu thay đổi phiên bản
│   ├── ApprovalQueue.tsx        ← hàng đợi phê duyệt (manager/admin)
│   ├── BundleView.tsx           ← bộ tài liệu onboarding + đào tạo
│   └── NamingGuide.tsx          ← hướng dẫn đặt tên + công cụ tạo tên
└── utils/
    ├── namingValidator.ts  ← validateName, buildCanonicalName, suggestCanonicalName
    └── lifecycle.ts        ← TRANSITIONS, getAllowedTransitions, STATUS_LABELS/COLORS
```

## Firestore Collections

| Collection | Mục đích |
|---|---|
| `doc_vault` | Metadata tài liệu + ACL |
| `doc_vault_versions` | Lịch sử phiên bản |
| `doc_vault_change_requests` | Yêu cầu thay đổi phiên bản |
| `doc_vault_acknowledgments` | Xác nhận đã đọc của nhân viên |

## Firebase Storage Paths

```
doc_vault/{docId}/current/{canonicalName}
doc_vault/{docId}/versions/v{X.Y}/{canonicalName}
doc_vault/{docId}/staged/cr_{crId}/{proposedName}
```

## Quy tắc phân quyền (ACL)

Mỗi tài liệu có `acl: { viewers, editors, approvers, isSensitive }`.

- `viewers`: chỉ xem, tải xuống
- `editors`: thêm phiên bản, gửi change request
- `approvers`: phê duyệt, từ chối, lưu trữ, hủy + xem tài liệu nhạy cảm
- `isSensitive: true`: chỉ approvers mới thấy tài liệu

Role `admin` trong hệ thống có toàn quyền bất kể ACL.

ACL được enforce 3 lớp:
1. Firestore Security Rules (server)
2. `useDocuments` filter phía client
3. `usePermission` gate các nút action trong UI

## Vòng đời tài liệu

```
draft → review → approved → archived → destroyed
              ↓
          rejected (quay về draft)
```

## Naming Convention

Xem `skill.md` để biết quy tắc đầy đủ. Format:
```
[DEPT]-[LOAI]-[YYYYMM]-[TenTaiLieu]-v[X.Y].[ext]
```

## Lưu ý khi sửa code

- Không dùng `array-contains` trên nhiều trường khác nhau trong cùng 1 Firestore query (Firestore không hỗ trợ). Filter phía client.
- Khi destroy tài liệu: xóa Storage file, xóa `downloadURL` và `currentStoragePath` khỏi Firestore record, giữ record lại cho audit.
- CR approval không atomic: update Firestore trước, Storage sau (safe to retry).
- `getDownloadURL` trả về token URL không hết hạn — chỉ expose URL sau khi kiểm tra ACL.
