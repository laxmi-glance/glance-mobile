import { apiClient } from "../config/api";
import type {
  ApListParams,
  ApprovalStatus,
  FinancialDocumentDetail,
  FinancialDocumentListItem,
  FinancialDocumentStats,
  PaginatedResponse,
} from "../types/models";

class FinancialDocumentService {
  async listApDocuments(
    params?: ApListParams
  ): Promise<PaginatedResponse<FinancialDocumentListItem>> {
    const { data } = await apiClient.get<PaginatedResponse<FinancialDocumentListItem>>(
      "/financial-document/financial-documents/",
      {
        params: {
          entity_type: "AP",
          is_deleted: false,
          page: params?.page || 1,
          per_page: params?.per_page || 25,
          search: params?.search || undefined,
          approval_status: params?.approval_status || undefined,
        },
      }
    );
    return data;
  }

  async getApStats(): Promise<FinancialDocumentStats> {
    const { data } = await apiClient.get<FinancialDocumentStats>(
      "/financial-document/financial-documents/stats/",
      { params: { entity_type: "AP", is_deleted: false } }
    );
    return data;
  }

  async getDocument(documentId: string): Promise<FinancialDocumentDetail> {
    const { data } = await apiClient.get<FinancialDocumentDetail>(
      `/financial-document/financial-document/${documentId}/`
    );
    return data;
  }

  async submitApproval(input: {
    documentId: string;
    approvalId?: string | null;
    status: ApprovalStatus;
    userId?: string | null;
    remarks?: string;
  }): Promise<void> {
    const body: Record<string, string> = {
      financial_document: input.documentId,
      approval_status: input.status,
    };
    if (input.userId) {
      body.approved_by = input.userId;
    }
    if (input.remarks) {
      body.remarks = input.remarks;
    }

    if (input.approvalId) {
      await apiClient.put(`/financial-document/document-approval/${input.approvalId}/`, body);
      return;
    }
    await apiClient.post("/financial-document/document-approval/", body);
  }
}

export default new FinancialDocumentService();
