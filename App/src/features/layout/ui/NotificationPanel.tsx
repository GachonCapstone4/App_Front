import { Bell } from "lucide-react";
import { useNavigate } from "react-router";
import { StatusBadge } from "../../../shared/ui/primitives/StatusBadge";
import type { NotificationItem, StatusBadgeTone } from "../../../shared/types";

const toneToBadge = {
  teal: "teal",
  amber: "warning",
  red: "red",
} satisfies Record<NotificationItem["tone"], StatusBadgeTone>;

interface NotificationPanelProps {
  open: boolean;
  notifications: NotificationItem[];
  activeFilter: "all" | "unread";
  onToggle: () => void;
  onFilterChange: (filter: "all" | "unread") => void;
  onMarkAllRead: () => void;
  onNotificationRead: (id: string) => void;
}

export function NotificationPanel({
  open,
  notifications,
  activeFilter,
  onToggle,
  onFilterChange,
  onMarkAllRead,
  onNotificationRead,
}: NotificationPanelProps) {
  const navigate = useNavigate();
  const unreadCount = notifications.filter((item: NotificationItem) => !item.read).length;
  const visibleNotifications =
    activeFilter === "unread"
      ? notifications.filter((item: NotificationItem) => !item.read)
      : notifications;

  return (
    <div className="relative">
      <button
        type="button"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#64748B] transition hover:bg-[#F1F5F9] dark:text-muted-foreground dark:hover:bg-[#1E293B]"
        onClick={onToggle}
      >
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span className="absolute right-0 top-0 inline-flex min-w-[18px] -translate-y-1/4 translate-x-1/4 items-center justify-center rounded-full bg-[#2DD4BF] px-1.5 py-0.5 text-[10px] font-semibold text-[#083344] dark:bg-[#0F766E] dark:text-[#CCFBF1]">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(92vw,380px)] rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">알림</p>
            <button
              type="button"
              className="text-xs font-medium text-[#0F766E] dark:text-[#5EEAD4]"
              onClick={onMarkAllRead}
            >
              모두 읽음 처리
            </button>
          </div>

          <div className="mb-4 flex gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                activeFilter === "all"
                  ? "app-cta-primary"
                  : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-muted-foreground"
              }`}
              onClick={() => onFilterChange("all")}
            >
              전체
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                activeFilter === "unread"
                  ? "app-cta-primary"
                  : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E293B] dark:text-muted-foreground"
              }`}
              onClick={() => onFilterChange("unread")}
            >
              미확인
            </button>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">표시할 알림이 없습니다</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  새 알림이 도착하면 이곳에 표시됩니다.
                </p>
              </div>
            ) : null}

            {visibleNotifications.map((item: NotificationItem) => (
              <button
                key={item.id}
                type="button"
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  item.read
                    ? "border-border bg-card hover:bg-[#F8FAFC] dark:hover:bg-[#131D2F]"
                    : "app-selected-surface"
                }`}
                onClick={() => {
                  onNotificationRead(item.id);
                  navigate(item.actionPath);
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <StatusBadge label={item.actionLabel} tone={toneToBadge[item.tone]} />
                </div>
                <p className="text-xs text-muted-foreground">{item.content}</p>
                <p className="mt-2 text-[11px] text-slate-400">{item.time}</p>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
