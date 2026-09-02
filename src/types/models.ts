export type TenantLifecycleStatus = "ACTIVE" | "DRAFT" | "CANCELLED" | string;

export interface Tenant {
  tenant_id: string;
  company_name: string;
  role: string;
  is_current?: boolean;
  logo_url?: string | null;
  logo?: string | null;
  lifecycle_status?: TenantLifecycleStatus | null;
  is_deactivated?: boolean;
  access_notice?: string | null;
}

export interface PendingInvitation {
  id: string;
  invitation_token: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  company_name?: string;
  invited_by_name?: string;
  expires_at?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  tenants: Tenant[];
  pending_invitations: PendingInvitation[];
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface UserProfile {
  id?: string;
  username: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  profile_pic?: string | null;
  profile_pic_url?: string | null;
  tenant_id?: string;
  company_id?: string;
  company_name?: string;
  is_active?: boolean;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";
export type GLPostingStatus = "PENDING" | "POSTED" | "VOIDED";
export type ValidationStatus = "full" | "partial" | "low" | "pending" | "failed";

export interface PartyBrief {
  id: string;
  name: string;
  alias?: string | null;
  gstin?: string | null;
  pan_number?: string | null;
}

export interface UserBrief {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface FinancialDocumentListItem {
  id: string;
  document_type?: string | null;
  entity_type?: "AP" | "AR" | string | null;
  document_source?: string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  party?: PartyBrief | null;
  suggested_party?: PartyBrief | null;
  linked_to_party?: boolean | null;
  line_total?: string | number | null;
  total?: string | number | null;
  tax?: string | number | null;
  tds?: string | number | null;
  invoice_currency?: string | null;
  gl_posting_status?: GLPostingStatus | null;
  approval_status?: ApprovalStatus | null;
  validation_status?: ValidationStatus | string | null;
  created_on: string;
  created_by_username?: string;
  created_by?: string;
  file_name?: string | null;
  file_url?: string | null;
  status?: string | null;
  error?: string | null;
}

export interface FinancialDocumentItem {
  id?: string | null;
  description?: string | null;
  quantity?: string | number | null;
  rate?: string | number | null;
  amount?: string | number | null;
  total?: string | number | null;
  line_total?: string | number | null;
  base_amount?: string | number | null;
  gst_rate?: string | number | null;
  gst_amount?: string | number | null;
  tds_amount?: string | number | null;
  transaction_nature?: string | null;
  posting_ledger?: { id?: string; title?: string } | null;
  parent_line_id?: string | null;
}

export interface DocumentApproval {
  id: string;
  approval_status: ApprovalStatus;
  approved_at?: string | null;
  rejected_at?: string | null;
  remarks?: string | null;
  requested_to?: UserBrief | null;
  requested_by?: UserBrief | null;
  approved_by?: UserBrief | null;
}

export interface FinancialDocumentDetail extends FinancialDocumentListItem {
  due_date?: string | null;
  amount?: string | number | null;
  net_payable?: string | number | null;
  sub_total?: string | number | null;
  approval_at?: string | null;
  document_approval?: DocumentApproval | null;
  items?: FinancialDocumentItem[];
}

export interface FinancialDocumentStats {
  total: number;
  pending: number;
  approved: number;
  approved_pending_post?: number;
  rejected: number;
}

export interface ApListParams {
  page?: number;
  per_page?: number;
  search?: string;
  approval_status?: ApprovalStatus;
}

export interface RbacConfig {
  version: number;
  description?: string;
  roles?: string[];
  permissions: Record<string, Record<string, string[]>>;
}

export interface LinkedFinancialDocument {
  id: string;
  invoice_number?: string | null;
  invoice_date?: string | null;
  created_on?: string;
  total?: number | null;
  approval_status?: string;
  document_type?: string;
}

export interface DuplicateOf {
  id: string;
  invoice_number?: string | null;
  file_name?: string;
  created_on?: string;
  total?: number | null;
  document_type?: string;
}

export interface ValidationSummary {
  overall_status?: string;
  overall_score?: number;
  summary?: Record<string, number>;
  recommendations?: string[];
}

export interface PreprocessingDocument {
  id: string;
  file_name: string;
  file_url?: string | null;
  document_type?: string | null;
  is_completed: boolean;
  is_processing: boolean;
  processing_started_at?: string | null;
  failure_count: number;
  error_log?: string | null;
  exception_log?: string | null;
  is_invalid_file?: boolean;
  processing_status_display: string;
  created_on: string;
  updated_on?: string;
  created_by?: string;
  duplicate_of?: DuplicateOf | null;
  financial_document?: LinkedFinancialDocument | null;
  validation_status?: string | null;
  validation_summary?: ValidationSummary | null;
  ocr_duration_seconds?: number | null;
  ml_duration_seconds?: number | null;
  total_processing_duration_seconds?: number | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface QueueStats {
  total: number;
  processing: number;
  completed: number;
  failed: number;
}

export type QueueSummaryStatus = "processing" | "completed" | "failed";

export interface QueueListParams {
  page?: number;
  per_page?: number;
  search?: string;
  summary_status?: QueueSummaryStatus;
}

export interface UploadResult {
  message?: string;
  success_count?: number;
  duplicate_count?: number;
  error_count?: number;
  duplicates?: {
    file_name: string;
    original_file?: string;
    original_id?: string;
  }[];
  errors?: { file_name?: string; detail?: string }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  timestamp: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  priority?: string;
  category?: string;
  severity?: string;
  fixable?: boolean;
  resolved?: boolean;
}
