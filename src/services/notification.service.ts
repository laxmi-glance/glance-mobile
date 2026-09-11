import { apiClient } from "../config/api";
import type { AppNotification, PaginatedResponse } from "../types/models";

class NotificationService {
  async list(page = 1): Promise<PaginatedResponse<AppNotification>> {
    const { data } = await apiClient.get<PaginatedResponse<AppNotification> | AppNotification[]>(
      "/users/notifications/",
      {
        params: { page, per_page: 25, ordering: "-created_on" },
      }
    );
    if (Array.isArray(data)) {
      return { count: data.length, next: null, previous: null, results: data };
    }
    return data;
  }

  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get<{ unread_count: number }>(
      "/users/notifications/unread-count/"
    );
    return data.unread_count ?? 0;
  }

  async markRead(id: string): Promise<void> {
    await apiClient.post(`/users/notifications/${id}/mark-read/`);
  }

  async markAllRead(): Promise<void> {
    await apiClient.post("/users/notifications/mark-all-read/");
  }
}

export default new NotificationService();
