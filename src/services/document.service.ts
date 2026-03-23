import apiClient from '../config/api';
import type { DocumentTypeValue } from '../constants/documentTypes';

/** Row from GET /financial-document/financial-documents/ (includes preprocessing stubs). */
export interface DocumentListItem {
  id: string;
  file_name?: string | null;
  approval_status?: string | null;
  /** Preprocessing rows only — human-readable status text */
  status?: string;
  created_on?: string;
  gl_posting_status?: string;
  invoice_number?: string | null;
  created_by_username?: string | null;
  document_type?: string | null;
}

export interface ProcessingQueueParams {
  page?: number;
  /** Backend uses `per_page` (see CustomPagination). */
  per_page?: number;
  status?: string;
  search?: string;
}

export interface ProcessingQueueResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentListItem[];
}

export interface DocumentStats {
  total: number;
  pending: number;
  approved: number;
  approved_pending_post: number;
  rejected: number;
}

export interface UploadFinancialDocumentFields {
  documentType: DocumentTypeValue;
  notes?: string;
  paymentMethodId?: string;
  expenseHeadId?: string;
}

/** Response shapes from `process_financial_document_upload` (200 / 207 / 409). */
export interface UploadFinancialDocumentResponse {
  message?: string;
  success_count?: number;
  duplicate_count?: number;
  error_count?: number;
  duplicates?: unknown[];
  errors?: string[];
  detail?: string;
}

export interface UploadFinancialDocumentProgress {
  loaded: number;
  total: number;
}

export interface LedgerAccountGroup {
  label: string;
  options: Array<{
    id: string;
    title: string;
    statutory_code?: string | null;
  }>;
}

class DocumentService {
  async getProcessingQueue(params?: ProcessingQueueParams): Promise<ProcessingQueueResponse> {
    const response = await apiClient.get<ProcessingQueueResponse>('/financial-document/financial-documents/', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.per_page ?? 20,
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.search ? { search: params.search } : {}),
      },
    });
    return response.data;
  }

  async getDocumentStats(): Promise<DocumentStats> {
    const response = await apiClient.get<DocumentStats>('/financial-document/financial-documents/stats/');
    return response.data;
  }

  async getLedgerAccountsByGroups(): Promise<LedgerAccountGroup[]> {
    const response = await apiClient.get<LedgerAccountGroup[]>('/ledger/ledger-account/by-groups/');
    return response.data || [];
  }

  async getDocumentDetail(documentId: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get<Record<string, unknown>>(
      `/financial-document/financial-document/${documentId}/`
    );
    return response.data;
  }

  async updateDocumentStatus(
    documentId: string,
    approvalStatus: 'approved' | 'rejected' | 'pending'
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.patch<Record<string, unknown>>(
      `/financial-document/financial-document/${documentId}/update-status/`,
      { approval_status: approvalStatus }
    );
    return response.data;
  }

  /**
   * Multipart upload to `POST /financial-document/upload-financial-documents/`.
   * File field name `invoices` matches backend `getlist("invoices")`.
   */
  async uploadFinancialDocument(
    file: { uri: string; name: string; type: string },
    fields: UploadFinancialDocumentFields,
    onProgress?: (p: UploadFinancialDocumentProgress) => void
  ): Promise<UploadFinancialDocumentResponse> {
    const formData = new FormData();
    formData.append(
      'invoices',
      { uri: file.uri, name: file.name, type: file.type } as unknown as Blob
    );
    formData.append('document_type', fields.documentType);
    if (fields.notes?.trim()) {
      formData.append('notes', fields.notes.trim());
    }
    if (fields.paymentMethodId) {
      formData.append('payment_method', fields.paymentMethodId);
    }
    if (fields.expenseHeadId) {
      formData.append('expense_head', fields.expenseHeadId);
    }

    const response = await apiClient.post<UploadFinancialDocumentResponse>(
      '/financial-document/upload-financial-documents/',
      formData,
      {
        onUploadProgress: (evt) => {
          if (onProgress && evt.total != null && evt.total > 0) {
            onProgress({ loaded: evt.loaded, total: evt.total });
          }
        },
      }
    );
    return response.data;
  }
}

export default new DocumentService();
