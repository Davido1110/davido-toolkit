// ─── Database table types ────────────────────────────────────────────────────

export interface ProductCategory {
  category_id: number;
  category_name: string;
  parent_id: number | null;
  has_child: boolean;
  is_active: boolean;
  synced_at: string | null;
}

export interface Branch {
  branch_id: number;
  branch_name: string;
  is_warehouse_only: boolean;
  is_active: boolean;
  synced_at: string | null;
}

export interface Product {
  product_id: number;
  code: string;
  name: string;
  full_name: string;
  category_id: number | null;
  category_name: string | null;
  base_price: number;
  is_active: boolean;
  modified_date: string | null;
}

export interface Invoice {
  invoice_id: number;
  invoice_code: string;
  branch_id: number;
  customer_id: number | null;
  customer_name: string | null;
  status: number;
  total: number;
  discount: number;
  invoice_date: string;
  modified_date: string;
}

export interface InvoiceDetail {
  id: number;
  invoice_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  price: number;
  discount: number;
}

export interface SyncLog {
  id: number;
  sync_type: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed' | 'partial';
  records_synced: number;
  requests_used: number;
  error_message: string | null;
  branch_id: number | null;
}

// ─── KiotViet API response types ─────────────────────────────────────────────

export interface KVTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface KVBranch {
  id: number;
  branchName: string;
  isActive: boolean;
}

export interface KVInventoryDetail {
  branchId: number;
  onHand: number;
  onOrder: number;
  reserved: number;
}

export interface KVProduct {
  id: number;
  code: string;
  name: string;
  fullName: string;
  categoryId: number | null;
  categoryName: string | null;
  basePrice: number;
  isActive: boolean;
  modifiedDate: string;
  inventories: KVInventoryDetail[];
}

export interface KVPagedResponse<T> {
  total: number;
  pageSize: number;
  data: T[];
}

// ─── UI state types ───────────────────────────────────────────────────────────

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface SyncProgress {
  running: boolean;
  phase: string;
  requestsUsed: number;
  recordsSynced: number;
  error: string | null;
}
