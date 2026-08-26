import { apiClient } from "../config/api";
import { resolvePeriodBounds } from "../utils/period";
import type {
  ActionItem,
  ActivityItem,
  BankAccount,
  CompleteDashboard,
  ComplianceEvent,
  DashboardPeriod,
  JournalEntryBrief,
  PartySpend,
  PendingApprovalItem,
} from "../types/dashboard";

async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

class DashboardService {
  async getComplete(): Promise<CompleteDashboard | null> {
    const { data } = await apiClient.get<CompleteDashboard>("/reports/complete/");
    return data;
  }

  async getActionItems(): Promise<ActionItem[]> {
    const { data } = await apiClient.get<{ items?: ActionItem[] }>(
      "/reports/dashboard/action-items/"
    );
    return data?.items || [];
  }

  async getMyPendingApprovals(limit = 8): Promise<{ items: PendingApprovalItem[]; total: number }> {
    const { data } = await apiClient.get<{ items?: PendingApprovalItem[]; total?: number }>(
      "/reports/dashboard/my-pending-approvals/",
      { params: { limit } }
    );
    return { items: data?.items || [], total: data?.total ?? data?.items?.length ?? 0 };
  }

  async getBankAccounts(): Promise<BankAccount[]> {
    const { data } = await apiClient.get<BankAccount[] | { results?: BankAccount[] }>(
      "/bank/bank-all/"
    );
    if (Array.isArray(data)) {
      return data;
    }
    return data?.results || [];
  }

  async getPlSnapshot(period: DashboardPeriod = "fy") {
    const bounds = resolvePeriodBounds(period);
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/reports/profit-and-loss/",
      {
        params: {
          start_date: bounds.startDate,
          end_date: bounds.endDate,
          compare_start_date: bounds.compareStartDate,
          compare_end_date: bounds.compareEndDate,
        },
      }
    );
    return { ...data, period, period_label: bounds.label };
  }

  async getBalanceSheet() {
    const asOf = new Date();
    const compare = new Date(asOf.getFullYear(), asOf.getMonth() - 1, asOf.getDate());
    const pad = (n: number) => String(n).padStart(2, "0");
    const asOfDate = `${asOf.getFullYear()}-${pad(asOf.getMonth() + 1)}-${pad(asOf.getDate())}`;
    const compareDate = `${compare.getFullYear()}-${pad(compare.getMonth() + 1)}-${pad(compare.getDate())}`;
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/reports/balance-sheet/",
      {
        params: { as_of_date: asOfDate, compare_as_of_date: compareDate },
      }
    );
    return data;
  }

  async getCashFlowTrend(days = 30) {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/dashboard/cash-flow-trend/",
      {
        params: { days },
      }
    );
    return data;
  }

  async getWorkingCapital() {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/dashboard/working-capital/"
    );
    return data;
  }

  async getTdsSummary(period: DashboardPeriod = "fy") {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/dashboard/tds-summary/",
      {
        params: { period },
      }
    );
    return data;
  }

  async getPriorYearBenchmark() {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/dashboard/prior-year-benchmark/"
    );
    return data;
  }

  async getInventorySummary() {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/reports/dashboard/inventory-summary/"
    );
    return data;
  }

  async getTopParties(entity: "AP" | "AR", period: DashboardPeriod = "fy"): Promise<PartySpend[]> {
    const { data } = await apiClient.get<{ parties?: PartySpend[] }>(
      "/reports/dashboard/top-parties/",
      {
        params: { entity, period, limit: 5 },
      }
    );
    return data?.parties || [];
  }

  async getComplianceEvents(days = 90): Promise<ComplianceEvent[]> {
    const { data } = await apiClient.get<{ events?: ComplianceEvent[] }>(
      "/reports/dashboard/compliance-events/",
      { params: { days } }
    );
    return data?.events || [];
  }

  async getUserActivity(limit = 8): Promise<ActivityItem[]> {
    const { data } = await apiClient.get<ActivityItem[] | { results?: ActivityItem[] }>(
      "/users/user-activity/",
      { params: { page: 1, per_page: limit, ordering: "-timestamp" } }
    );
    if (Array.isArray(data)) {
      return data;
    }
    return data?.results || [];
  }

  async getRecentJournalEntries(): Promise<JournalEntryBrief[]> {
    const { data } = await apiClient.get<{ results?: JournalEntryBrief[] }>(
      "/gl/journal-entries/",
      { params: { page: 1, per_page: 5, ordering: "-date" } }
    );
    return data?.results || [];
  }

  async getRecommendationStats() {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/document-processing/recommendation-statistics/"
    );
    return data;
  }

  async getErpSyncStatus() {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/integrations/active-sync-count/"
    );
    return data;
  }

  async getProcessingStats() {
    const { data } = await apiClient.get<Record<string, unknown>>(
      "/document-processing/preprocessing/stats/"
    );
    return data;
  }

  settle = settle;
}

export default new DashboardService();
