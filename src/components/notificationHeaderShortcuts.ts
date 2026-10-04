import type { PageHeaderShortcut } from "./PageHeader";
import type { UnreadCounts } from "../hooks/useUnreadCount";
import type { NotificationPanel } from "../utils/notificationKind";

export function notificationHeaderShortcuts(
  counts: UnreadCounts,
  onOpen: (panel: NotificationPanel) => void,
  active?: NotificationPanel | null
): PageHeaderShortcut[] {
  return [
    {
      icon: "notifications-outline",
      accessibilityLabel: "Notifications",
      badge: counts.general,
      badgeTone: "brand",
      active: active === "notifications",
      onPress: () => onOpen("notifications"),
    },
    {
      icon: "alert-circle-outline",
      accessibilityLabel: "Errors",
      badge: counts.errors,
      badgeTone: "danger",
      active: active === "errors",
      onPress: () => onOpen("errors"),
    },
  ];
}
