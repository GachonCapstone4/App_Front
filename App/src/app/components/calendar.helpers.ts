export type CalendarEventType = "meeting" | "call" | "video" | "deadline";

export function inferCalendarEventType(title: string): CalendarEventType {
  const normalizedTitle = title.trim().toLowerCase();

  if (
    normalizedTitle.includes("zoom") ||
    normalizedTitle.includes("meet") ||
    normalizedTitle.includes("화상") ||
    normalizedTitle.includes("웨비나") ||
    normalizedTitle.includes("video")
  ) {
    return "video";
  }

  if (
    normalizedTitle.includes("call") ||
    normalizedTitle.includes("콜") ||
    normalizedTitle.includes("통화") ||
    normalizedTitle.includes("전화")
  ) {
    return "call";
  }

  if (
    normalizedTitle.includes("deadline") ||
    normalizedTitle.includes("due") ||
    normalizedTitle.includes("마감")
  ) {
    return "deadline";
  }

  return "meeting";
}

export function splitCalendarDateTime(value: string, fallback = "00:00") {
  const [datePart, timePart] = value.split("T");

  if (!datePart || !timePart) {
    return {
      date: value,
      time: fallback,
    };
  }

  return {
    date: datePart,
    time: timePart.slice(0, 5),
  };
}

export function toCalendarApiDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function getCalendarMonthRange(year: number, month: number) {
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01T00:00:00`;
  const endDate = new Date(year, month + 1, 0);
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    endDate.getDate(),
  ).padStart(2, "0")}T23:59:59`;

  return { start, end };
}

export function isEndTimeBeforeStartTime(startTime: string, endTime: string) {
  return endTime < startTime;
}
