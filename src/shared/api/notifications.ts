import type { NotificationItem } from "../types";
import { api } from "./http";

type NotificationListApiResponse = {
  data: Array<{
    notification_id: number;
    type: string;
    title: string;
    noti_message: string;
    related_id: number | null;
    is_read: boolean;
  }>;
};

function normalizeType(type: string) {
  return type.trim().toUpperCase();
}

function buildNotificationMeta(type: string) {
  const normalizedType = normalizeType(type);

  if (normalizedType.includes("CALENDAR")) {
    return {
      actionLabel: "일정 확인",
      actionPath: "/app/calendar",
      tone: "teal" as const,
    };
  }

  if (
    normalizedType.includes("ERROR") ||
    normalizedType.includes("INTEGRATION") ||
    normalizedType.includes("ACCOUNT")
  ) {
    return {
      actionLabel: "설정 확인",
      actionPath: "/app/settings?tab=email",
      tone: "red" as const,
    };
  }

  if (normalizedType.includes("DRAFT")) {
    return {
      actionLabel: "초안 확인",
      actionPath: "/app/inbox",
      tone: "amber" as const,
    };
  }

  return {
    actionLabel: "확인하기",
    actionPath: "/app/inbox",
    tone: "teal" as const,
  };
}

function mapNotification(item: NotificationListApiResponse["data"][number]): NotificationItem {
  const meta = buildNotificationMeta(item.type);

  return {
    id: String(item.notification_id),
    type: item.type,
    title: item.title,
    content: item.noti_message,
    time: "최근",
    actionLabel: meta.actionLabel,
    actionPath: meta.actionPath,
    read: item.is_read,
    tone: meta.tone,
  };
}

export async function getNotifications(isRead?: boolean) {
  const response = await api.get<NotificationListApiResponse>("/api/notifications", {
    params: typeof isRead === "boolean" ? { is_read: isRead } : undefined,
  });

  return response.data.data.map(mapNotification);
}

export async function markNotificationRead(notificationId: string) {
  await api.patch(`/api/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch("/api/notifications/read-all");
}
