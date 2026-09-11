import type { DashboardLayoutKey, DashboardPeriod, DashboardSectionId } from "../types/dashboard";
import type { IconName } from "./features";

export const DOC_PROCESSING_ROLES = [
  "owner",
  "admin",
  "accountant",
  "standard_user",
  "auditor",
  "sales_manager",
];

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "fy", label: "FY to date" },
  { value: "mtd", label: "Month to date" },
  { value: "qtd", label: "Quarter to date" },
  { value: "30d", label: "Last 30 days" },
];

export const getPeriodLabel = (period: DashboardPeriod) =>
  DASHBOARD_PERIODS.find((item) => item.value === period)?.label || "FY to date";

export const LAYOUT_BY_ROLE: Record<string, DashboardLayoutKey> = {
  owner: "executive",
  admin: "executive",
  accountant: "accountant",
  standard_user: "operator",
  expense_manager: "operator",
  sales_manager: "sales",
  mis_reporter: "analytics",
  auditor: "auditor",
};

/** Shown on home until the user customizes. */
export const DEFAULT_VISIBLE_SECTIONS: DashboardSectionId[] = [
  "notifications",
  "myWork",
  "operations",
];

/** Retired section IDs → the widget they were merged into. */
export const SECTION_ALIASES: Record<string, DashboardSectionId> = {
  unreadNotifications: "notifications",
  pendingApprovals: "myWork",
  bankBalances: "cashPosition",
  automationTrend: "operations",
  approvalTrend: "operations",
  documentSource: "operations",
};

function withMobileCore(sections: DashboardSectionId[]): DashboardSectionId[] {
  const rest = sections.filter((id) => !DEFAULT_VISIBLE_SECTIONS.includes(id));
  return [...DEFAULT_VISIBLE_SECTIONS, ...rest];
}

export const LAYOUT_SECTIONS: Record<DashboardLayoutKey, DashboardSectionId[]> = {
  executive: withMobileCore([
    "actionInbox",
    "quickActions",
    "cashPosition",
    "plSnapshot",
    "bankReconciliation",
    "balanceSheet",
    "cashFlowTrend",
    "priorYearBenchmark",
    "workingCapital",
    "compliance",
    "tdsSummary",
    "inventorySummary",
    "currencyConverter",
    "tdsCalculator",
    "topVendors",
    "topCustomers",
    "sync",
    "aiAccuracy",
    "planUsage",
    "activityFeed",
    "team",
    "ledger",
  ]),
  accountant: withMobileCore([
    "actionInbox",
    "quickActions",
    "cashPosition",
    "plSnapshot",
    "bankReconciliation",
    "balanceSheet",
    "cashFlowTrend",
    "priorYearBenchmark",
    "workingCapital",
    "compliance",
    "tdsSummary",
    "inventorySummary",
    "currencyConverter",
    "tdsCalculator",
    "topVendors",
    "topCustomers",
    "sync",
    "aiAccuracy",
    "activityFeed",
    "ledger",
    "team",
  ]),
  operator: withMobileCore(["actionInbox", "quickActions", "currencyConverter", "tdsCalculator"]),
  sales: withMobileCore([
    "actionInbox",
    "quickActions",
    "plSnapshot",
    "cashPosition",
    "balanceSheet",
    "cashFlowTrend",
    "priorYearBenchmark",
    "workingCapital",
    "topVendors",
    "topCustomers",
    "currencyConverter",
    "tdsCalculator",
    "aiAccuracy",
  ]),
  analytics: withMobileCore([
    "actionInbox",
    "plSnapshot",
    "cashPosition",
    "balanceSheet",
    "cashFlowTrend",
    "priorYearBenchmark",
    "topVendors",
    "topCustomers",
    "aiAccuracy",
    "team",
  ]),
  auditor: withMobileCore([
    "actionInbox",
    "cashPosition",
    "plSnapshot",
    "bankReconciliation",
    "balanceSheet",
    "cashFlowTrend",
    "priorYearBenchmark",
    "topVendors",
    "topCustomers",
    "aiAccuracy",
    "sync",
    "ledger",
  ]),
};

export const SECTION_LABELS: Record<string, string> = {
  actionInbox: "Needs Attention",
  myWork: "My Approvals",
  quickActions: "Quick Actions",
  cashPosition: "Cash Position",
  plSnapshot: "P&L Snapshot",
  bankReconciliation: "Bank Reconciliation",
  balanceSheet: "Balance Sheet",
  cashFlowTrend: "Cash Flow Trend",
  workingCapital: "Working Capital",
  compliance: "Compliance Calendar",
  tdsSummary: "TDS Summary",
  priorYearBenchmark: "Prior Year Benchmark",
  inventorySummary: "Inventory Snapshot",
  currencyConverter: "Currency Converter",
  tdsCalculator: "TDS Calculator",
  operations: "Document Processing",
  topVendors: "Top Vendors by Spend",
  topCustomers: "Top Customers by Revenue",
  sync: "ERP Sync",
  aiAccuracy: "AI Ledger Accuracy",
  planUsage: "Plan Usage",
  notifications: "Notifications",
  activityFeed: "Recent Activity",
  team: "Team Activity",
  ledger: "Recent Journal Entries",
};

export const SECTION_ICONS: Record<string, IconName> = {
  actionInbox: "alert-circle-outline",
  myWork: "checkmark-done-outline",
  quickActions: "flash-outline",
  cashPosition: "wallet-outline",
  plSnapshot: "trending-up-outline",
  bankReconciliation: "git-compare-outline",
  balanceSheet: "scale-outline",
  cashFlowTrend: "swap-vertical-outline",
  workingCapital: "swap-horizontal-outline",
  compliance: "calendar-outline",
  tdsSummary: "calculator-outline",
  priorYearBenchmark: "analytics-outline",
  inventorySummary: "cube-outline",
  currencyConverter: "cash-outline",
  tdsCalculator: "calculator-outline",
  operations: "documents-outline",
  topVendors: "storefront-outline",
  topCustomers: "people-outline",
  sync: "sync-outline",
  aiAccuracy: "sparkles-outline",
  planUsage: "speedometer-outline",
  notifications: "notifications-outline",
  activityFeed: "time-outline",
  team: "people-circle-outline",
  ledger: "book-outline",
};

export const WEB_ONLY_SECTIONS = new Set(["currencyConverter", "tdsCalculator", "planUsage"]);

export const WEB_PATHS: Record<string, string> = {
  currencyConverter: "/",
  tdsCalculator: "/",
  planUsage: "/company/subscription",
  cashPosition: "/banking",
  bankReconciliation: "/banking",
  inventorySummary: "/inventory",
  sync: "/automation/erp-integration",
  ledger: "/accounting/general-ledger",
};

export const resolveLayoutKey = (role?: string | null): DashboardLayoutKey =>
  LAYOUT_BY_ROLE[String(role || "").toLowerCase()] || "executive";

export const getLayoutSections = (role?: string | null): DashboardSectionId[] =>
  LAYOUT_SECTIONS[resolveLayoutKey(role)] || LAYOUT_SECTIONS.executive;

export const getSectionLabel = (sectionId: string) => SECTION_LABELS[sectionId] || sectionId;
