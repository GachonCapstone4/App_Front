const DATE_TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/;
const DATE_TIME_ZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/i;

function normalizeServerDateTime(value: string) {
  const trimmed = value.trim();

  if (DATE_TIME_WITHOUT_ZONE.test(trimmed) && !DATE_TIME_ZONE_SUFFIX.test(trimmed)) {
    return `${trimmed}+09:00`;
  }

  return trimmed;
}

export function parseKstDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(normalizeServerDateTime(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function formatKstDateTime(value: string | null | undefined) {
  const date = parseKstDateTime(value);

  if (!date) {
    return value ?? "";
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

export function formatKstTime(value: string | null | undefined) {
  const date = parseKstDateTime(value);

  if (!date) {
    return value ?? "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatKstHourMinute(value: string | null | undefined) {
  const date = parseKstDateTime(value);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatKstMonthDay(value: string | null | undefined) {
  const date = parseKstDateTime(value);

  if (!date) {
    return value ?? "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  })
    .format(date)
    .replace(/\s/g, "");
}

export function formatKstCompactDate(value: string | null | undefined) {
  const date = parseKstDateTime(value);

  if (!date) {
    return value ?? "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .format(date)
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}

export function formatKstRelativeTime(value: string, now = new Date()) {
  const date = parseKstDateTime(value);

  if (!date) {
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

  return formatKstCompactDate(value);
}

export function splitKstDateTime(value: string, fallback = "00:00") {
  const date = parseKstDateTime(value);

  if (!date) {
    return {
      date: value,
      time: fallback,
    };
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${byType.year}-${byType.month}-${byType.day}`,
    time: `${byType.hour}:${byType.minute}`,
  };
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
