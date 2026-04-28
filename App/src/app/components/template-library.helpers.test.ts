import { describe, expect, it } from "vitest";
import {
  formatRelativeTimeLabel,
  isRecentlyUpdatedLabel,
} from "./template-library.helpers";

describe("template-library helpers", () => {
  const now = new Date("2026-04-04T12:00:00Z");

  it("returns '방금 전' for very recent dates", () => {
    expect(formatRelativeTimeLabel("2026-04-04T11:59:30Z", now)).toBe("방금 전");
  });

  it("returns hour labels for same-day dates", () => {
    expect(formatRelativeTimeLabel("2026-04-04T09:00:00Z", now)).toBe("3시간 전");
  });

  it("returns day labels for recent dates", () => {
    expect(formatRelativeTimeLabel("2026-04-02T12:00:00Z", now)).toBe("2일 전");
  });

  it("keeps invalid values unchanged", () => {
    expect(formatRelativeTimeLabel("시간 정보 없음", now)).toBe("시간 정보 없음");
  });

  it("detects recent update labels", () => {
    expect(isRecentlyUpdatedLabel("방금 전")).toBe(true);
    expect(isRecentlyUpdatedLabel("25분 전")).toBe(true);
    expect(isRecentlyUpdatedLabel("2시간 전")).toBe(true);
    expect(isRecentlyUpdatedLabel("3일 전")).toBe(false);
  });
});
