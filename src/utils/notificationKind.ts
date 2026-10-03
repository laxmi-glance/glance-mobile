/** Header Notifications vs Errors classification. Mirrors glance-frontend notificationKind.js. */

type NotificationLike = {
  category?: string | null;
  type?: string | null;
  severity?: string | null;
  title?: string | null;
  resolved?: boolean | null;
  resolved_at?: string | null;
};

export const isErrorNotification = (notification: NotificationLike) => {
  const category = String(notification?.category || "").toLowerCase();
  if (category === "data_integrity") return true;
  const type = String(notification?.type || "").toLowerCase();
  if (type.includes("error") || type.includes("fail") || type.includes("unreachable")) {
    return true;
  }
  const severity = String(notification?.severity || "").toLowerCase();
  if (severity === "critical" || severity === "high") return true;
  const title = String(notification?.title || "").toLowerCase();
  if (title.includes("failed") || title.includes("error") || title.includes("unreachable")) {
    return true;
  }
  return false;
};

export const isInErrorsTab = (notification: NotificationLike) => isErrorNotification(notification);

export const isInGeneralTab = (notification: NotificationLike) => !isInErrorsTab(notification);

export type NotificationPanel = "notifications" | "errors";

export function isNotificationPanel(value: unknown): value is NotificationPanel {
  return value === "notifications" || value === "errors";
}
