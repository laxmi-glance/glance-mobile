import apiClient from '../config/api';

export interface UserNotificationItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  category?: string | null;
  read: boolean;
  timestamp: string;
  link?: string | null;
}

class NotificationService {
  async getNotifications(): Promise<UserNotificationItem[]> {
    const response = await apiClient.get<UserNotificationItem[] | { results?: UserNotificationItem[] }>(
      '/users/notifications/',
      { params: { non_paginated: true } }
    );

    const payload = response.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    return payload?.results ?? [];
  }
}

export default new NotificationService();
