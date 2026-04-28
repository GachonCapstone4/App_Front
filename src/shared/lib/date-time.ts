const DATE_TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;

function normalizeServerDateTime(value: string) {
  const trimmed = value.trim();

  if (DATE_TIME_WITHOUT_ZONE.test(trimmed)) {
    return `${trimmed}Z`;
  }

  return trimmed;
}

export function formatKstDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(normalizeServerDateTime(value));

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatKstDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}
