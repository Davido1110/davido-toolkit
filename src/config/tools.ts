import { lazy, type ComponentType } from 'react';

export interface ToolMeta {
  id: string;
  name: string;
  description: string;
  path: string;       // route path, e.g. /tools/po-calculator
  category: string;
  icon: string;       // emoji or icon key
  component: ComponentType;
  tags?: string[];
  badge?: string;     // e.g. "New", "Beta"
}

export interface ToolCategory {
  id: string;
  label: string;
  icon: string;
}

export const CATEGORIES: ToolCategory[] = [
  { id: 'warehouse',    label: 'Warehouse & Purchasing', icon: '📦' },
  { id: 'finance',      label: 'Finance & Tax',          icon: '💰' },
  { id: 'dev',          label: 'Development Tools',      icon: '🛠️' },
  { id: 'productivity', label: 'Productivity',           icon: '⚡' },
];

export const TOOLS: ToolMeta[] = [
  {
    id: 'po-calculator',
    name: 'PO Calculator',
    description: 'Upload SKU inventory, compute suggested purchase order quantities, review and export.',
    path: '/tools/po-calculator',
    category: 'warehouse',
    icon: '📊',
    tags: ['excel', 'inventory', 'purchase order'],
    component: lazy(() => import('../tools/po-calculator')),
  },
  {
    id: 'contract-generator',
    name: 'Contract Generator',
    description: 'Tạo Hợp đồng hợp tác & Biên bản nghiệm thu (BBNT) cho Công ty TNHH Leonardo.',
    path: '/tools/contract-generator',
    category: 'productivity',
    icon: '📄',
    tags: ['contract', 'docx', 'leonardo', 'bbnt'],
    component: lazy(() => import('../tools/contract-generator')),
  },
  {
    id: 'pay-slip',
    name: 'Bảng Lương (Pay-slip)',
    description: 'Tính toán bảng lương thuế cho Cty & HKD — OT, hoa hồng, phụ cấp. Export Excel.',
    path: '/tools/pay-slip',
    category: 'finance',
    icon: '💸',
    tags: ['lương', 'payroll', 'excel', 'OT', 'hoa hồng', 'finance'],
    component: lazy(() => import('../tools/Pay-slip')),
  },
  {
    id: 'net-to-gross',
    name: 'Net → Gross',
    description: 'Tính ngược Gross từ lương Net mục tiêu — BHXH, phụ cấp, KPI, quỹ lương DN.',
    path: '/tools/net-to-gross',
    category: 'finance',
    icon: '💱',
    tags: ['lương', 'gross', 'net', 'BHXH', 'phiếu lương', 'finance'],
    component: lazy(() => import('../tools/net-to-gross')),
  },
  {
    id: 'sop-management',
    name: 'SOP Management',
    description: 'Tạo & quản lý quy trình nội bộ (SOP), onboarding nhân viên, AI hỏi đáp, báo cáo tự động.',
    path: '/tools/sop-management',
    category: 'productivity',
    icon: '📋',
    tags: ['SOP', 'quy trình', 'onboarding', 'AI', 'báo cáo'],
    badge: 'New',
    component: lazy(() => import('../tools/SOP-Management')),
  },
// Add more tools here — each with its own lazy import
];
