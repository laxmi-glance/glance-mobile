export type DashboardPeriod = "fy" | "mtd" | "qtd" | "30d";

export type DashboardLayoutKey =
  "executive" | "accountant" | "operator" | "sales" | "analytics" | "auditor";

export type DashboardSectionId =
  | "unreadNotifications"
  | "pendingApprovals"
  | "actionInbox"
  | "myWork"
  | "quickActions"
  | "cashPosition"
  | "plSnapshot"
  | "bankReconciliation"
  | "balanceSheet"
  | "cashFlowTrend"
  | "bankBalances"
  | "workingCapital"
  | "compliance"
  | "tdsSummary"
  | "priorYearBenchmark"
  | "inventorySummary"
  | "currencyConverter"
  | "tdsCalculator"
  | "operations"
  | "topVendors"
  | "topCustomers"
  | "sync"
  | "automationTrend"
  | "approvalTrend"
  | "documentSource"
  | "aiAccuracy"
  | "planUsage"
  | "notifications"
  | "activityFeed"
  | "team"
  | "ledger";

export type LayoutConfig = {
  order: string[];
  hidden: string[];
};

export type UserPreferences = {
  dashboard_sections?: Record<string, LayoutConfig | string[]>;
  mobile_dashboard_sections?: Record<string, LayoutConfig | string[]>;
  date_format?: string;
  timezone?: string;
  theme?: "light" | "dark" | "auto";
};

export type DashboardPerms = {
  role: string;
  isOwnerOrAdmin: boolean;
  canApprove: boolean;
  canUpload: boolean;
  canViewStatutoryReports: boolean;
  canViewBanking: boolean;
  canViewGlList: boolean;
  canViewApInsights: boolean;
  canViewArInsights: boolean;
  canAccessDocProcessing: boolean;
  canViewTds: boolean;
};

export type ActionItem = {
  id: string;
  severity?: "high" | "medium" | "low" | "info" | string;
  title: string;
  subtitle?: string | null;
  href?: string | null;
  cta?: string | null;
};

export type PendingApprovalItem = {
  id: string;
  party_name?: string | null;
  invoice_number?: string | null;
  amount?: number | string | null;
  waiting_days?: number | null;
  href?: string | null;
};

export type BankAccount = {
  id: string;
  account_name?: string | null;
  bank_name?: string | null;
  account_type?: string | null;
  current_balance?: number | string | null;
  opening_balance?: number | string | null;
};

export type PartySpend = {
  party_id?: string;
  name: string;
  total?: number;
  count?: number;
};

export type ActivityItem = {
  id?: string;
  username?: string;
  action?: string;
  description?: string;
  object_repr?: string;
  model?: string;
  timestamp?: string;
};

export type JournalEntryBrief = {
  id: string;
  date?: string | null;
  voucher_number?: string | null;
  narration?: string | null;
  total_debit?: number | string | null;
  post_status?: string | null;
};

export type ComplianceEvent = {
  type?: string;
  title: string;
  due_date?: string | null;
  severity?: string;
  href?: string | null;
};

export type AsyncList<T> = { loading: boolean; data: T[] };
export type AsyncValue<T> = { loading: boolean; data: T | null };

export type CompleteDashboard = {
  generated_at?: string;
  user_activity_metrics?: {
    active_users?: number;
    team_size?: number;
    top_users?: {
      user__first_name?: string;
      user__last_name?: string;
      activity_count?: number;
      last_activity?: string;
    }[];
  };
  real_time_stats?: {
    documents_today?: number;
    approvals_today?: number;
    active_users_today?: number;
  };
  approval_workflow_metrics?: {
    total_pending?: number;
    total_approved?: number;
    avg_approval_time_hours?: number;
    approval_rate?: number;
    approval_trends?: { day?: string; approved?: number }[];
  };
  bank_reconciliation_metrics?: {
    reconciliation_rate?: number;
    unreconciled_transactions?: number;
    total_transactions?: number;
    unreconciled_amount?: number;
  };
  document_processing_metrics?: {
    ap_docs?: {
      total_processed?: number;
      email_received?: number;
      uploaded?: number;
      manually_created?: number;
    };
    ar_docs?: { total_processed?: number };
  };
  automation_efficiency_metrics?: { automation_rate?: number };
  processing_efficiency?: {
    overall_efficiency?: number;
    efficiency_trend?: { date?: string; automation_rate?: number }[];
  };
  alert_notifications?: {
    alerts?: {
      type?: string;
      message?: string;
      count?: number;
      severity?: string;
      action_required?: boolean;
    }[];
  };
  [key: string]: unknown;
};

export type DashboardSecondary = {
  actionItems: AsyncList<ActionItem>;
  myPendingApprovals: AsyncValue<{ items: PendingApprovalItem[]; total: number }>;
  bankAccounts: AsyncList<BankAccount>;
  plData: AsyncValue<Record<string, unknown>>;
  balanceSheet: AsyncValue<Record<string, unknown>>;
  cashFlowTrend: AsyncValue<Record<string, unknown>>;
  workingCapital: AsyncValue<Record<string, unknown>>;
  complianceEvents: AsyncList<ComplianceEvent>;
  tdsSummary: AsyncValue<Record<string, unknown>>;
  priorYearBenchmark: AsyncValue<Record<string, unknown>>;
  inventorySummary: AsyncValue<Record<string, unknown>>;
  processingStats: AsyncValue<Record<string, unknown>>;
  topVendors: AsyncList<PartySpend>;
  topCustomers: AsyncList<PartySpend>;
  recommendationStats: AsyncValue<Record<string, unknown>>;
  userActivity: AsyncList<ActivityItem>;
  recentJE: AsyncList<JournalEntryBrief>;
  erpSync: AsyncValue<Record<string, unknown>>;
  notifications: AsyncList<{
    id: string;
    title?: string;
    message?: string;
    timestamp?: string;
    read?: boolean;
  }>;
};
