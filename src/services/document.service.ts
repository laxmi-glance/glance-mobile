import { apiClient } from "../config/api";
import { UPLOAD_TIMEOUT_MS } from "../config/env";
import type {
  PaginatedResponse,
  PreprocessingDocument,
  QueueListParams,
  QueueStats,
  UploadResult,
} from "../types/models";

export interface LocalUploadFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

class DocumentService {
  async getProcessingQueue(
    params?: QueueListParams
  ): Promise<PaginatedResponse<PreprocessingDocument>> {
    const { data } = await apiClient.get<PaginatedResponse<PreprocessingDocument>>(
      "/document-processing/preprocessing/",
      {
        params: {
          page: params?.page || 1,
          per_page: params?.per_page || 25,
          search: params?.search || undefined,
          summary_status: params?.summary_status || undefined,
        },
      }
    );
    return data;
  }

  async getQueueStats(): Promise<QueueStats> {
    const { data } = await apiClient.get<QueueStats>("/document-processing/preprocessing/stats/");
    return data;
  }

  async getDocumentDetail(documentId: string): Promise<PreprocessingDocument> {
    const { data } = await apiClient.get<PreprocessingDocument>(
      `/document-processing/preprocessing/${documentId}/`
    );
    return data;
  }

  async retryDocument(
    documentId: string
  ): Promise<{ message: string; id: string; file_name: string }> {
    const { data } = await apiClient.post(
      `/document-processing/preprocessing/${documentId}/retry/`
    );
    return data;
  }

  async uploadDocuments(files: LocalUploadFile[]): Promise<UploadResult> {
    const form = new FormData();
    files.forEach((file) => {
      form.append("documents", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      } as unknown as Blob);
    });

    const { data } = await apiClient.post<UploadResult>(
      "/financial-document/upload-financial-documents/",
      form,
      { timeout: UPLOAD_TIMEOUT_MS }
    );
    return data;
  }
}

export default new DocumentService();
