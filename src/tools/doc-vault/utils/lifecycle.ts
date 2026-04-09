import { DocStatus } from '../types';

type Role = 'user' | 'manager' | 'admin';

export interface TransitionRule {
  from: DocStatus;
  to: DocStatus;
  label: string;
  minRole: Role;
  variant: 'primary' | 'danger' | 'secondary';
  confirmMessage?: string;
}

export const TRANSITIONS: TransitionRule[] = [
  { from: 'draft', to: 'review', label: 'Gửi duyệt', minRole: 'user', variant: 'primary' },
  { from: 'rejected', to: 'review', label: 'Gửi lại', minRole: 'user', variant: 'primary' },
  { from: 'review', to: 'approved', label: 'Phê duyệt', minRole: 'manager', variant: 'primary' },
  { from: 'review', to: 'rejected', label: 'Từ chối', minRole: 'manager', variant: 'danger', confirmMessage: 'Xác nhận từ chối tài liệu này?' },
  { from: 'approved', to: 'archived', label: 'Lưu trữ', minRole: 'manager', variant: 'secondary', confirmMessage: 'Tài liệu sẽ được chuyển sang trạng thái lưu trữ.' },
  { from: 'archived', to: 'destroyed', label: 'Hủy vĩnh viễn', minRole: 'admin', variant: 'danger', confirmMessage: 'Cảnh báo: File sẽ bị xóa vĩnh viễn khỏi Storage. Tiếp tục?' },
];

const ROLE_RANK: Record<Role, number> = { user: 0, manager: 1, admin: 2 };

export function getAllowedTransitions(status: DocStatus, role: Role): TransitionRule[] {
  return TRANSITIONS.filter(
    (t) => t.from === status && ROLE_RANK[role] >= ROLE_RANK[t.minRole]
  );
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  draft: 'Nháp',
  review: 'Chờ duyệt',
  approved: 'Đã duyệt',
  archived: 'Lưu trữ',
  destroyed: 'Đã hủy',
  rejected: 'Từ chối',
};

export const STATUS_COLORS: Record<DocStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  archived: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  destroyed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};
