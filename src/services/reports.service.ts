import { apiClient } from "../config/api";
import type { PaginatedResponse } from "../types/models";
import type {
  BalanceSheetReport,
  FiscalYearBounds,
  ProfitAndLossReport,
  SyncTrackerItem,
  TrialBalanceReport,
  UserActivityItem,
} from "../types/reports";

export type ReportPage<T> = {
  results: T[];
  next: string | null;
  count: number;
};

function asPage<T>(data: PaginatedResponse<T> | T[] | null | undefined): ReportPage<T> {
  if (Array.isArray(data)) {
    return { results: data, next: null, count: data.length };
  }
  const results = data?.results || [];
  return {
    results,
    next: data?.next ?? null,
    count: data?.count ?? results.length,
  };
}

class ReportsService {
  async getActiveFiscalYear(): Promise<FiscalYearBounds | null> {
    try {
      const { data } = await apiClient.get<{
        name?: string;
        start_date?: string;
        end_date?: string;
      }>("/fiscal-year/fiscal-years/active/");
      if (!data?.start_date || !data?.end_date) {
        return null;
      }
      return {
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
      };
    } catch {
      return null;
    }
  }

  async getProfitAndLoss(startDate: string, endDate: string): Promise<ProfitAndLossReport> {
    const { data } = await apiClient.get<ProfitAndLossReport>("/reports/reports/profit-and-loss/", {
      params: {
        start_date: startDate,
        end_date: endDate,
        detailed: "true",
      },
    });
    return data;
  }

  async getBalanceSheet(asOfDate: string): Promise<BalanceSheetReport> {
    const { data } = await apiClient.get<BalanceSheetReport>("/reports/reports/balance-sheet/", {
      params: {
        as_of_date: asOfDate,
        detailed: "true",
      },
    });
    return data;
  }

  async getTrialBalance(fromDate: string, toDate: string): Promise<TrialBalanceReport> {
    const { data } = await apiClient.get<TrialBalanceReport>("/reports/reports/trial-balance/", {
      params: {
        from_date: fromDate,
        to_date: toDate,
        grouped: "false",
      },
    });
    return data;
  }

  async getUserActivity(params: {
    page: number;
    search?: string;
    startDate: string;
    endDate: string;
  }): Promise<ReportPage<UserActivityItem>> {
    const { data } = await apiClient.get<PaginatedResponse<UserActivityItem>>(
      "/users/user-activity/",
      {
        params: {
          page: params.page,
          per_page: 25,
          search: params.search || undefined,
          start_date: params.startDate,
          end_date: params.endDate,
        },
      }
    );
    return asPage(data);
  }

  async getSyncTrackers(params: {
    page: number;
    search?: string;
    status?: string;
    startDate: string;
    endDate: string;
  }): Promise<ReportPage<SyncTrackerItem>> {
    const { data } = await apiClient.get<PaginatedResponse<SyncTrackerItem>>(
      "/integrations/sync-trackers/",
      {
        params: {
          page: params.page,
          per_page: 25,
          ordering: "-updated_on",
          include_related_count: 1,
          search: params.search || undefined,
          status: params.status || undefined,
          start_date: params.startDate,
          end_date: params.endDate,
        },
      }
    );
    return asPage(data);
  }

  async getSyncTracker(id: string): Promise<SyncTrackerItem> {
    const { data } = await apiClient.get<SyncTrackerItem>(`/integrations/sync-trackers/${id}/`);
    return data;
  }
}

export default new ReportsService();
