import apiClient from '../config/api';

export interface Document {
  id: number;
  file_name: string;
  status: 'processing' | 'completed' | 'failed' | 'pending';
  uploaded_at: string;
  processed_at?: string;
  file_type?: string;
  file_size?: number;
  // Add other document fields as needed
}

export interface ProcessingQueueParams {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
}

export interface ProcessingQueueResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Document[];
}

class DocumentService {
  async getProcessingQueue(params?: ProcessingQueueParams): Promise<ProcessingQueueResponse> {
    try {
      const response = await apiClient.get<ProcessingQueueResponse>('/documents/processing-queue/', {
        params: {
          page: params?.page || 1,
          page_size: params?.page_size || 20,
          ...params,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getDocumentDetail(documentId: number): Promise<Document> {
    try {
      const response = await apiClient.get<Document>(`/documents/${documentId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async retryDocument(documentId: number): Promise<Document> {
    try {
      const response = await apiClient.post<Document>(`/documents/${documentId}/retry/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new DocumentService();
