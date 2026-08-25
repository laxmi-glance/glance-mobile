import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { MainTabParamList, RootStackParamList } from "../types/navigation";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export type AppFeature = {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  available: boolean;
  tab?: keyof MainTabParamList;
  stack?: keyof RootStackParamList;
};

/**
 * Mobile workspace modules. Mark a feature `available` and add a `tab` or `stack`
 * when it ships — Home and More pick this catalog up automatically.
 */
export const APP_FEATURES: AppFeature[] = [
  {
    id: "ap",
    title: "Payables",
    subtitle: "Amounts, status, and approvals",
    icon: "receipt-outline",
    available: true,
    tab: "AP",
  },
  {
    id: "queue",
    title: "Docs processing",
    subtitle: "Capture, upload, and track OCR",
    icon: "documents-outline",
    available: true,
    tab: "Queue",
  },
  {
    id: "notifications",
    title: "Notifications",
    subtitle: "Approvals, failures, and mentions",
    icon: "notifications-outline",
    available: true,
    stack: "Notifications",
  },
  {
    id: "banking",
    title: "Banking",
    subtitle: "Balances and reconciliation",
    icon: "card-outline",
    available: false,
  },
  {
    id: "reports",
    title: "Reports",
    subtitle: "P&L, aging, and cash flow",
    icon: "bar-chart-outline",
    available: false,
  },
  {
    id: "ledger",
    title: "General ledger",
    subtitle: "Accounts and journal entries",
    icon: "book-outline",
    available: false,
  },
];

export function comingSoonCopy(title: string): string {
  return `${title} is coming to the Glancewise app in a later release. Use the web workspace for the full experience.`;
}
