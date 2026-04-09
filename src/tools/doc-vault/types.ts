import { Timestamp } from 'firebase/firestore';

export const DEPT_CODES = ['MKT', 'HR', 'FIN', 'OPS', 'IT', 'SALE', 'PRD', 'GEN'] as const;
export type DeptCode = (typeof DEPT_CODES)[number];

export const LOAI_CODES = ['SOP', 'POL', 'MAN', 'FORM', 'RPT', 'CTR', 'OTH'] as const;
export type LoaiCode = (typeof LOAI_CODES)[number];

export const DEPT_LABELS: Record<DeptCode, string> = {
  MKT: 'Marketing',
  HR: 'Nhân sự',
  FIN: 'Tài chính',
  OPS: 'Vận hành',
  IT: 'Công nghệ',
  SALE: 'Kinh doanh',
  PRD: 'Sản phẩm',
  GEN: 'Chung',
};

export const LOAI_LABELS: Record<LoaiCode, string> = {
  SOP: 'Quy trình (SOP)',
  POL: 'Chính sách (POL)',
  MAN: 'Hướng dẫn (MAN)',
  FORM: 'Biểu mẫu (FORM)',
  RPT: 'Báo cáo (RPT)',
  CTR: 'Hợp đồng (CTR)',
  OTH: 'Khác (OTH)',
};

export type DocFormat = 'docx' | 'xlsx';
export type DocStatus = 'draft' | 'review' | 'approved' | 'archived' | 'destroyed' | 'rejected';
export type BundleType = 'onboarding' | 'training';
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface DocACL {
  viewers: string[];
  editors: string[];
  approvers: string[];
  isSensitive: boolean;
}

export interface DocRecord {
  id: string;
  canonicalName: string;
  dept: DeptCode;
  loai: LoaiCode;
  yyyymm: string;
  tenTaiLieu: string;
  versionMajor: number;
  versionMinor: number;
  format: DocFormat;
  category: string;
  year: number;
  project?: string;
  description?: string;
  status: DocStatus;
  currentStoragePath: string;
  downloadURL: string;
  acl: DocACL;
  bundles: BundleType[];
  requiresAck: boolean;
  ackUserIds: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
}

export interface DocVersion {
  id: string;
  docId: string;
  versionMajor: number;
  versionMinor: number;
  canonicalName: string;
  storagePath: string;
  downloadURL: string;
  changeNote: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  status: 'active' | 'superseded';
}

export interface ChangeRequest {
  id: string;
  docId: string;
  proposedVersionMajor: number;
  proposedVersionMinor: number;
  proposedStoragePath: string;
  proposedDownloadURL: string;
  changeNote: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: Timestamp;
  status: ChangeRequestStatus;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  reviewNote?: string;
}

export interface DocAcknowledgment {
  id: string;
  docId: string;
  docVersion: string;
  userId: string;
  userName: string;
  acknowledgedAt: Timestamp;
  note?: string;
}
