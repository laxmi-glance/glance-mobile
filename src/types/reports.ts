export type ReportDateMode = "range" | "date";

export type ReportPresetId =
  | "current-fy"
  | "fy-to-date"
  | "previous-fy"
  | "today"
  | "this-week"
  | "this-month"
  | "this-quarter"
  | "this-year"
  | "yesterday"
  | "previous-week"
  | "previous-month"
  | "previous-quarter"
  | "previous-year";

export type FiscalYearBounds = {
  name?: string;
  startDate: string;
  endDate: string;
};

export type ReportPreset = {
  id: ReportPresetId;
  label: string;
  startDate: string;
  endDate: string;
};

export type ReportRange = {
  id: ReportPresetId | "custom";
  label: string;
  startDate: string;
  endDate: string;
};

export type ReportAmountMode = "signed" | "drcr";

export type ReportNodeKind = "section" | "group" | "account" | "total" | "result";

export type ReportNode = {
  id: string;
  kind: ReportNodeKind;
  label: string;
  amount: number | null;
  debit: number | null;
  credit: number | null;
  mode: ReportAmountMode;
  openingDebit: number | null;
  openingCredit: number | null;
  periodDebit: number | null;
  periodCredit: number | null;
  children: ReportNode[];
};

export type ReportFigure = {
  id: string;
  label: string;
  value: string;
  tone: "success" | "danger" | "neutral";
};

export type FinancialReportModel = {
  figures: ReportFigure[];
  nodes: ReportNode[];
  notices: string[];
  balanced: boolean | null;
};

export type ReportNoticeSource = {
  opening_balance_health?: { healthy?: boolean; message?: string | null } | null;
  data_integrity_warnings?: { message?: string | null; title?: string | null }[] | null;
};

export type ProfitLossLine = {
  account_id?: string;
  account_name?: string;
  line_total?: number | string | null;
  group_name?: string | null;
  ledger_group_name?: string | null;
  sub_group_name?: string | null;
  primary_group_name?: string | null;
  top_group_name?: string | null;
  ledger_group_id?: string | null;
  group_id?: string | null;
};

export type ProfitLossGroup = {
  group_name?: string;
  group_id?: string;
  items?: ProfitLossLine[];
  subtotal?: number | string | null;
};

export type ProfitLossBucket = {
  groups?: ProfitLossGroup[];
  items?: ProfitLossLine[];
  total?: number | string | null;
};

export type ProfitAndLossReport = ReportNoticeSource & {
  income?: {
    operating_income?: ProfitLossBucket;
    other_income?: ProfitLossBucket;
    items?: ProfitLossLine[];
    total?: number | string | null;
  };
  expenses?: {
    cost_of_goods_sold?: ProfitLossBucket;
    operating_expenses?: ProfitLossBucket;
    other_expenses?: ProfitLossBucket;
    items?: ProfitLossLine[];
    total?: number | string | null;
  };
  net_profit?: number | string | null;
};

export type BalanceSheetLine = {
  account_id?: string;
  account_name?: string;
  line_total?: number | string | null;
};

export type BalanceSheetGroup = {
  group_name?: string;
  group_id?: string;
  items?: BalanceSheetLine[];
  subtotal?: number | string | null;
};

export type BalanceSheetSection = {
  groups?: BalanceSheetGroup[];
  items?: BalanceSheetLine[];
  total?: number | string | null;
};

export type BalanceSheetReport = ReportNoticeSource & {
  no_data?: boolean;
  as_of_date?: string;
  assets?: BalanceSheetSection;
  liabilities?: BalanceSheetSection;
  equity?: BalanceSheetSection;
  profit_and_loss?: {
    side?: "assets" | "liabilities" | string;
    opening_balance?: number | string | null;
    current_period?: number | string | null;
    total?: number | string | null;
  } | null;
};

export type TrialBalanceLine = {
  ledger_id?: string;
  ledger_name?: string;
  group_name?: string | null;
  top_group_name?: string | null;
  primary_group_name?: string | null;
  sub_group_name?: string | null;
  nature_of_group?: string | null;
  opening_debit?: number | string | null;
  opening_credit?: number | string | null;
  period_debit?: number | string | null;
  period_credit?: number | string | null;
  closing_debit?: number | string | null;
  closing_credit?: number | string | null;
};

export type TrialBalanceReport = ReportNoticeSource & {
  lines?: TrialBalanceLine[];
  totals?: {
    opening_debit?: number | string | null;
    opening_credit?: number | string | null;
    period_debit?: number | string | null;
    period_credit?: number | string | null;
    closing_debit?: number | string | null;
    closing_credit?: number | string | null;
  };
};

export type ActivityChangeRow = {
  key: string;
  field: string;
  from: string;
  to: string;
};

export type UserActivityItem = {
  id: string;
  timestamp?: string | null;
  username?: string | null;
  action?: string | null;
  model?: string | null;
  description?: string | null;
  object_repr?: string | null;
  file_name?: string | null;
  changes?: Record<string, unknown> | null;
  related_count?: number;
  related_activities?: UserActivityItem[];
  latest_sync_status?: string | null;
};

export type SyncParty = {
  id?: string;
  display_name?: string | null;
};

export type SyncHistoryItem = {
  id?: string;
  synced_at?: string | null;
  action?: string | null;
  status?: string | null;
  message?: string | null;
  display_name?: string | null;
};

export type SyncTrackerItem = {
  id: string;
  entity_type?: string | null;
  entity_id?: string | null;
  display_name?: string | null;
  source_system?: SyncParty | null;
  destination_system?: SyncParty | null;
  last_action?: string | null;
  last_sync_status?: string | null;
  last_synced_at?: string | null;
  error_message?: string | null;
  retry_count?: number | null;
  created_on?: string | null;
  tally_voucher_number?: string | null;
  related_count?: number | null;
  history?: SyncHistoryItem[];
};
