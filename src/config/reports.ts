import type { IconName } from "./features";

export type ReportId =
  | "profit-and-loss"
  | "balance-sheet"
  | "trial-balance"
  | "group-summary"
  | "user-activity"
  | "sync-tracker";

export type AppReport = {
  id: ReportId;
  title: string;
  subtitle: string;
  icon: IconName;
  path: string;
};

export type ReportGroup = {
  id: string;
  title: string;
  reports: AppReport[];
};

export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: "financial",
    title: "Financial",
    reports: [
      {
        id: "profit-and-loss",
        title: "Profit & Loss A/c",
        subtitle: "Income, expenses, and net profit for the period",
        icon: "trending-up-outline",
        path: "/reports/profit-and-loss",
      },
      {
        id: "balance-sheet",
        title: "Balance Sheet",
        subtitle: "Assets, liabilities, and equity as of a date",
        icon: "scale-outline",
        path: "/reports/balance-sheet",
      },
      {
        id: "trial-balance",
        title: "Trial Balance",
        subtitle: "Debit and credit totals for every ledger",
        icon: "list-outline",
        path: "/reports/trial-balance",
      },
      {
        id: "group-summary",
        title: "Group Summary",
        subtitle: "Balances rolled up by account group",
        icon: "layers-outline",
        path: "/reports/group-summary",
      },
    ],
  },
  {
    id: "activity",
    title: "Activity",
    reports: [
      {
        id: "user-activity",
        title: "User Activity",
        subtitle: "Workspace actions by user and time",
        icon: "people-outline",
        path: "/reports/user-activity-logs",
      },
      {
        id: "sync-tracker",
        title: "Sync Tracker",
        subtitle: "Tally and integration sync history",
        icon: "sync-outline",
        path: "/reports/sync-tracker",
      },
    ],
  },
];

export const APP_REPORTS: AppReport[] = REPORT_GROUPS.flatMap((group) => group.reports);

export function getReportById(id: string): AppReport | undefined {
  return APP_REPORTS.find((report) => report.id === id);
}
