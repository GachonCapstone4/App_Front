import { describe, expect, it } from "vitest";
import {
  getCalendarMonthRange,
  inferCalendarEventType,
  isEndTimeBeforeStartTime,
  splitCalendarDateTime,
  toCalendarApiDateTime,
} from "./calendar.helpers";

describe("calendar helpers", () => {
  it("infers video type from meeting link keywords", () => {
    expect(inferCalendarEventType("Zoom 웨비나 안내")).toBe("video");
  });

  it("infers deadline type from title keywords", () => {
    expect(inferCalendarEventType("월간 성과 보고 마감")).toBe("deadline");
  });

  it("splits API datetime into date and time", () => {
    expect(splitCalendarDateTime("2026-04-04T14:30:00")).toEqual({
      date: "2026-04-04",
      time: "14:30",
    });
  });

  it("builds API datetime from date and time", () => {
    expect(toCalendarApiDateTime("2026-04-04", "14:30")).toBe("2026-04-04T14:30:00");
  });

  it("returns month range boundaries", () => {
    expect(getCalendarMonthRange(2026, 3)).toEqual({
      start: "2026-04-01T00:00:00",
      end: "2026-04-30T23:59:59",
    });
  });

  it("compares time order correctly", () => {
    expect(isEndTimeBeforeStartTime("14:00", "13:30")).toBe(true);
    expect(isEndTimeBeforeStartTime("14:00", "14:30")).toBe(false);
  });
});
