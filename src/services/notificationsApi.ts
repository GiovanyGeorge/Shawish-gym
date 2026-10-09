import { ipcInvoke } from "@/services/ipc";

export type NotificationRow = {
  id: number;
  category: string;
  type: string | null;
  title: string;
  body: string | null;
  related_path: string | null;
  reference_key: string | null;
  is_read: number;
  created_at: string;
};

export function fetchNotifications(filter: "all" | "unread" = "all") {
  return ipcInvoke<NotificationRow[]>("notifications:list", { filter });
}

export function fetchUnreadCount() {
  return ipcInvoke<number>("notifications:unreadCount");
}

export function markNotificationRead(id: number) {
  return ipcInvoke<{ ok: true }>("notifications:markRead", { id });
}

export function markAllNotificationsRead() {
  return ipcInvoke<{ ok: true }>("notifications:markAllRead");
}

export function deleteNotification(id: number) {
  return ipcInvoke<{ ok: true }>("notifications:delete", { id });
}

export function scanNotifications() {
  return ipcInvoke<{ ok: true }>("notifications:scan");
}
