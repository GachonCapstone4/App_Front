import { formatKstRelativeTime } from "../../shared/lib/date-time";

export function formatRelativeTimeLabel(value: string, now = new Date()) {
  return formatKstRelativeTime(value, now);
}

export function isRecentlyUpdatedLabel(label: string) {
  return label.includes("방금") || label.includes("분") || label.includes("시간");
}
