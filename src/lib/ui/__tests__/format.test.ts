import { describe, expect, it } from "vitest";
import {
  formatChatTime,
  formatDaySeparator,
  formatMoney,
  formatMoneyWithSuffix,
  formatRelativeListTime,
  initialsFor,
} from "../format";

/*
 * A fixed "now" so these never depend on when CI runs. Local-noon
 * construction for the same reason formatEventDate() does it: a DST boundary
 * between two dates must not shift the day difference by one.
 */
const NOW = new Date("2026-10-09T12:00:00");

describe("formatMoney", () => {
  it("renders whole dollars with separators and no cents", () => {
    expect(formatMoney(4500)).toBe("$4,500");
    expect(formatMoney(0)).toBe("$0");
    expect(formatMoney(1234567)).toBe("$1,234,567");
  });

  it("rounds rather than showing cents a negotiated figure never had", () => {
    expect(formatMoney(4500.4)).toBe("$4,500");
    expect(formatMoney(4500.6)).toBe("$4,501");
  });

  it("appends a rate suffix only when there is one", () => {
    expect(formatMoneyWithSuffix(150, "/hr")).toBe("$150/hr");
    expect(formatMoneyWithSuffix(150, null)).toBe("$150");
  });
});

describe("formatChatTime", () => {
  it("gives a bare 12-hour time with no seconds", () => {
    expect(formatChatTime("2026-10-09T19:41:22")).toBe("7:41 PM");
    expect(formatChatTime("2026-10-09T09:05:00")).toBe("9:05 AM");
  });

  it("returns empty for an unparseable value rather than 'Invalid Date'", () => {
    expect(formatChatTime("not-a-date")).toBe("");
  });
});

describe("formatDaySeparator", () => {
  it("names today and yesterday", () => {
    expect(formatDaySeparator("2026-10-09T08:00:00", NOW)).toBe("Today");
    expect(formatDaySeparator("2026-10-08T23:59:00", NOW)).toBe("Yesterday");
  });

  it("counts calendar days, not elapsed hours", () => {
    // 40 minutes earlier but across midnight — still "Yesterday", not "Today".
    expect(formatDaySeparator("2026-10-08T23:30:00", new Date("2026-10-09T00:10:00"))).toBe("Yesterday");
  });

  it("uses a weekday inside the past week and drops it beyond", () => {
    expect(formatDaySeparator("2026-10-05T10:00:00", NOW)).toContain("Mon");
    expect(formatDaySeparator("2026-09-20T10:00:00", NOW)).not.toContain("Sun");
  });

  it("adds the year once it is not this year", () => {
    expect(formatDaySeparator("2025-10-03T10:00:00", NOW)).toContain("2025");
    expect(formatDaySeparator("2026-10-03T10:00:00", NOW)).not.toContain("2026");
  });

  it("never renders a raw ISO string", () => {
    expect(formatDaySeparator("2026-08-23T10:00:00", NOW)).not.toContain("2026-08-23");
  });
});

describe("formatRelativeListTime", () => {
  it("shows a time today, a word yesterday, a weekday this week, a date beyond", () => {
    expect(formatRelativeListTime("2026-10-09T19:41:00", NOW)).toBe("7:41 PM");
    expect(formatRelativeListTime("2026-10-08T19:41:00", NOW)).toBe("Yesterday");
    expect(formatRelativeListTime("2026-10-05T19:41:00", NOW)).toBe("Mon");
    expect(formatRelativeListTime("2026-09-20T19:41:00", NOW)).toBe("Sep 20");
  });

  it("is empty for a thread that has no messages yet", () => {
    expect(formatRelativeListTime(null, NOW)).toBe("");
  });
});

describe("initialsFor", () => {
  it("takes first and last initials", () => {
    expect(initialsFor("Lena Ortiz")).toBe("LO");
    expect(initialsFor("Mary Jane Watson")).toBe("MW");
  });

  it("handles a single name and junk without throwing", () => {
    expect(initialsFor("Prince")).toBe("PR");
    expect(initialsFor("  ")).toBe("?");
  });
});
