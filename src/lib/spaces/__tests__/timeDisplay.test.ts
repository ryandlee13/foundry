import { describe, expect, it } from "vitest";
import { formatTimeDisplay, formatTimeRange } from "../bookingConstraints";

describe("formatTimeDisplay", () => {
  it("renders morning times with AM", () => {
    expect(formatTimeDisplay("09:30")).toBe("9:30 AM");
  });

  it("renders afternoon times with PM", () => {
    expect(formatTimeDisplay("18:00")).toBe("6:00 PM");
  });

  it("renders midnight as 12 AM, not 0", () => {
    expect(formatTimeDisplay("00:00")).toBe("12:00 AM");
  });

  it("renders noon as 12 PM, not 0", () => {
    expect(formatTimeDisplay("12:00")).toBe("12:00 PM");
  });

  it("keeps a leading-zero minute", () => {
    expect(formatTimeDisplay("13:05")).toBe("1:05 PM");
  });

  it("passes unparseable input through untouched rather than showing NaN", () => {
    expect(formatTimeDisplay("")).toBe("");
    expect(formatTimeDisplay("25:00")).toBe("25:00");
  });
});

describe("formatTimeRange", () => {
  it("joins both ends with an en dash", () => {
    expect(formatTimeRange("18:00", "23:00")).toBe("6:00 PM – 11:00 PM");
  });

  it("handles a range crossing midnight", () => {
    expect(formatTimeRange("22:00", "02:00")).toBe("10:00 PM – 2:00 AM");
  });
});
