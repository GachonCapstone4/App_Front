export function formatRelativeTimeLabel(value: string, now = new Date()) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = now.getTime() - date.getTime();

  if (diffMs <= 60_000) {
    return "방금 전";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return date
    .toLocaleDateString("ko-KR")
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}

export function isRecentlyUpdatedLabel(label: string) {
  return label.includes("방금") || label.includes("분") || label.includes("시간");
}
