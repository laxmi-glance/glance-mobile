import { apiClient } from "../config/api";
import type {
  AccountBalance,
  JournalEntryDetail,
  JournalEntryListItem,
  LedgerAccount,
  LedgerGroup,
  LedgerTransaction,
} from "../types/accounting";
import type { PaginatedResponse } from "../types/models";
import type { ReportPage } from "./reports.service";

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

class AccountingService {
  async listLedgerAccounts(params: {
    page?: number;
    search?: string;
    groupTitle?: string;
  }): Promise<ReportPage<LedgerAccount>> {
    const { data } = await apiClient.get<PaginatedResponse<LedgerAccount> | LedgerAccount[]>(
      "/ledger/ledger-account/",
      {
        params: {
          page: params.page ?? 1,
          per_page: 25,
          search: params.search || undefined,
          group_title: params.groupTitle || undefined,
        },
      }
    );
    return asPage(data);
  }

  async listLedgerGroups(params: {
    page?: number;
    search?: string;
  }): Promise<ReportPage<LedgerGroup>> {
    const { data } = await apiClient.get<PaginatedResponse<LedgerGroup> | LedgerGroup[]>(
      "/ledger/ledger-group/",
      {
        params: {
          page: params.page ?? 1,
          per_page: 25,
          search: params.search || undefined,
        },
      }
    );
    return asPage(data);
  }

  async getLedgerAccount(accountId: string): Promise<LedgerAccount> {
    const { data } = await apiClient.get<LedgerAccount>(`/ledger/ledger-account/${accountId}/`);
    return data;
  }

  async listJournalEntries(params: {
    page?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ReportPage<JournalEntryListItem>> {
    const { data } = await apiClient.get<PaginatedResponse<JournalEntryListItem>>(
      "/gl/journal-entries/",
      {
        params: {
          page: params.page ?? 1,
          per_page: 25,
          ordering: "-date",
          search: params.search || undefined,
          date_from: params.dateFrom,
          date_to: params.dateTo,
        },
      }
    );
    return asPage(data);
  }

  async getJournalEntry(entryId: string): Promise<JournalEntryDetail> {
    const { data } = await apiClient.get<JournalEntryDetail>(`/gl/journal-entries/${entryId}/`);
    return data;
  }

  async listLedgerTransactions(params: {
    accountId: string;
    page?: number;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    includeRunningBalance?: boolean;
  }): Promise<ReportPage<LedgerTransaction>> {
    const { data } = await apiClient.get<PaginatedResponse<LedgerTransaction>>(
      "/gl/journal-lines/",
      {
        params: {
          account: params.accountId,
          page: params.page ?? 1,
          per_page: 25,
          search: params.search || undefined,
          date_from: params.dateFrom,
          date_to: params.dateTo,
          include_running_balance: params.includeRunningBalance ? "true" : undefined,
        },
      }
    );
    return asPage(data);
  }

  async getOpeningBalance(accountId: string, dateTo: string): Promise<AccountBalance> {
    const { data } = await apiClient.get<AccountBalance>("/gl/journal-lines/account-balance/", {
      params: {
        account: accountId,
        date_to: dateTo,
        as_opening: "true",
      },
    });
    return data;
  }
}

const accountingService = new AccountingService();
export default accountingService;
