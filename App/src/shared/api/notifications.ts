import type { NotificationItem } from "../types";
import type { NotificationSettings } from "../types";
import { api } from "./http";

type NotificationListApiResponse = {
  notifications?: Array<{
    notification_id: number;
    type: string;
    title: string;
    noti_message: string;
    related_id: number | null;
    is_read: boolean;
  }>;
  data?: Array<{
    notification_id: number;
    type: string;
    title: string;
    noti_message: string;
    related_id: number | null;
    is_read: boolean;
  }>;
};

type NotificationSettingsApiResponse = {
  NEW_EMAIL?: boolean;
  DRAFT_PENDING?: boolean;
  DRAFT_THRESHOLD?: number | string | null;
  EMAIL_DISCONNECTED?: boolean;
  UNCLASSIFIED_EMAIL?: boolean;
  EVENT_PENDING?: boolean;
  AUTO_SEND_SUMMARY?: boolean;
  AUTO_SEND_FAILED?: boolean;
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newEmail: true,
  draftQueue: true,
  draftThreshold: 3,
  accountError: true,
  unclassified: true,
  calendarQueue: true,
  dailySummary: true,
  autoSendFailure: true,
};

function mapSettingsFromApi(data: NotificationSettingsApiResponse): NotificationSettings {
  const draftThreshold = Number(data.DRAFT_THRESHOLD);

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    newEmail: data.NEW_EMAIL ?? DEFAULT_NOTIFICATION_SETTINGS.newEmail,
    draftQueue: data.DRAFT_PENDING ?? DEFAULT_NOTIFICATION_SETTINGS.draftQueue,
    draftThreshold:
      Number.isFinite(draftThreshold) && draftThreshold > 0
        ? draftThreshold
        : DEFAULT_NOTIFICATION_SETTINGS.draftThreshold,
    accountError: data.EMAIL_DISCONNECTED ?? DEFAULT_NOTIFICATION_SETTINGS.accountError,
    unclassified: data.UNCLASSIFIED_EMAIL ?? DEFAULT_NOTIFICATION_SETTINGS.unclassified,
    calendarQueue: data.EVENT_PENDING ?? DEFAULT_NOTIFICATION_SETTINGS.calendarQueue,
    dailySummary: data.AUTO_SEND_SUMMARY ?? DEFAULT_NOTIFICATION_SETTINGS.dailySummary,
    autoSendFailure: data.AUTO_SEND_FAILED ?? DEFAULT_NOTIFICATION_SETTINGS.autoSendFailure,
  };
}

function mapSettingsToApi(settings: NotificationSettings): NotificationSettingsApiResponse {
  return {
    NEW_EMAIL: settings.newEmail,
    DRAFT_PENDING: settings.draftQueue,
    DRAFT_THRESHOLD: settings.draftThreshold,
    EMAIL_DISCONNECTED: settings.accountError,
    UNCLASSIFIED_EMAIL: settings.unclassified,
    EVENT_PENDING: settings.calendarQueue,
    AUTO_SEND_SUMMARY: settings.dailySummary,
    AUTO_SEND_FAILED: settings.autoSendFailure,
  };
}

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
    normalizedType.includes("ACCOUNT") ||
    normalizedType.includes("FAILED")
  ) {
    return {
      actionLabel: normalizedType.includes("AUTO_SEND") ? "초안 확인" : "설정 확인",
      actionPath: normalizedType.includes("AUTO_SEND") ? "/app/inbox" : "/app/settings?tab=email",
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

  if (normalizedType.includes("SUMMARY")) {
    return {
      actionLabel: "요약 확인",
      actionPath: "/app/dashboard",
      tone: "teal" as const,
    };
  }

  return {
    actionLabel: "확인하기",
    actionPath: "/app/inbox",
    tone: "teal" as const,
  };
}

type NotificationApiItem = NonNullable<
  NotificationListApiResponse["notifications"] | NotificationListApiResponse["data"]
>[number];

function mapNotification(item: NotificationApiItem): NotificationItem {
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

  const notifications = response.data.notifications ?? response.data.data ?? [];

  return notifications.map(mapNotification);
}

export async function markNotificationRead(notificationId: string) {
  await api.patch(`/api/notifications/${notificationId}/read`);
}

export async function markAllNotificationsRead() {
  await api.patch("/api/notifications/read-all");
}

export async function getNotificationSettings() {
  const response = await api.get<NotificationSettingsApiResponse>("/api/notifications/settings");
  return mapSettingsFromApi(response.data);
}

export async function updateNotificationSettings(settings: NotificationSettings) {
  const response = await api.patch<NotificationSettingsApiResponse>(
    "/api/notifications/settings",
    mapSettingsToApi(settings),
  );
  return mapSettingsFromApi(response.data);
}
