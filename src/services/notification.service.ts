import { apiClient } from "../config/api";
import type { AppNotification, PaginatedResponse } from "../types/models";
import { isInErrorsTab, isInGeneralTab, type NotificationPanel } from "../utils/notificationKind";

const MARK_READ_CHUNK = 100;

function asPage(data: PaginatedResponse<AppNotification> | AppNotification[]) {
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return data;
}

class NotificationService {
  async list(page = 1, panel?: NotificationPanel): Promise<PaginatedResponse<AppNotification>> {
    const { data } = await apiClient.get<PaginatedResponse<AppNotification> | AppNotification[]>(
      "/users/notifications/",
      {
        params: {
          page,
          per_page: 25,
          ordering: "-created_on",
          ...(panel ? { panel } : {}),
        },
      }
    );
    const result = asPage(data);
    const rows = result.results ?? [];
    const inPanel = panel === "errors" ? isInErrorsTab : panel ? isInGeneralTab : null;
    if (!inPanel) {
      return { ...result, results: rows };
    }
    return { ...result, results: rows.filter(inPanel) };
  }

  async unreadCounts(): Promise<{ total: number; errors: number }> {
    const { data } = await apiClient.get<{ unread_count: number; unread_errors_count?: number }>(
      "/users/notifications/unread-count/"
    );
    return {
      total: data.unread_count ?? 0,
      errors: data.unread_errors_count ?? 0,
    };
  }

  async markRead(id: string): Promise<void> {
    await apiClient.post(`/users/notifications/${id}/mark-read/`);
  }

  async markPanelRead(panel: NotificationPanel): Promise<void> {
    const { data } = await apiClient.get<PaginatedResponse<AppNotification> | AppNotification[]>(
      "/users/notifications/",
      {
        params: { non_paginated: true, panel, ordering: "-created_on" },
      }
    );
    const inPanel = panel === "errors" ? isInErrorsTab : isInGeneralTab;
    const ids = (asPage(data).results ?? [])
      .filter((item) => inPanel(item) && !item.read)
      .map((item) => item.id);
    for (let index = 0; index < ids.length; index += MARK_READ_CHUNK) {
      await apiClient.post("/users/notifications/mark-read/", {
        ids: ids.slice(index, index + MARK_READ_CHUNK),
      });
    }
  }
}

export default new NotificationService();
