import { describe, expect, it } from "vitest";
import { computeExpiresAt, isPastExpiration, getEffectiveProposalStatus, formatExpiration, formatDeadlineDate } from "../expiration";

describe("computeExpiresAt", () => {
  it("adds the given number of days to the from-date", () => {
    const result = computeExpiresAt("2026-01-01T00:00:00.000Z", 5);
    expect(result).toBe("2026-01-06T00:00:00.000Z");
  });

  it("supports the 1-day option", () => {
    expect(computeExpiresAt("2026-01-01T00:00:00.000Z", 1)).toBe("2026-01-02T00:00:00.000Z");
  });
});

describe("isPastExpiration", () => {
  it("is false before the expiration instant", () => {
    expect(isPastExpiration("2026-01-05T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(false);
  });

  it("is true after the expiration instant", () => {
    expect(isPastExpiration("2026-01-01T00:00:00.000Z", "2026-01-05T00:00:00.000Z")).toBe(true);
  });

  it("treats the exact expiration instant as expired", () => {
    expect(isPastExpiration("2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(true);
  });
});

describe("getEffectiveProposalStatus", () => {
  const now = "2026-01-10T00:00:00.000Z";

  it("lapses a submitted proposal past its expiresAt into 'expired'", () => {
    const status = getEffectiveProposalStatus({ status: "submitted", expiresAt: "2026-01-01T00:00:00.000Z" }, now);
    expect(status).toBe("expired");
  });

  it("lapses a shortlisted proposal past its expiresAt into 'expired'", () => {
    const status = getEffectiveProposalStatus({ status: "shortlisted", expiresAt: "2026-01-01T00:00:00.000Z" }, now);
    expect(status).toBe("expired");
  });

  it("leaves a not-yet-expired submitted proposal untouched", () => {
    const status = getEffectiveProposalStatus({ status: "submitted", expiresAt: "2026-02-01T00:00:00.000Z" }, now);
    expect(status).toBe("submitted");
  });

  it("lapses an in-discussion proposal past its expiresAt into 'expired'", () => {
    const status = getEffectiveProposalStatus({ status: "in_discussion", expiresAt: "2026-01-01T00:00:00.000Z" }, now);
    expect(status).toBe("expired");
  });

  it("does not lapse terminal statuses even if expiresAt has passed", () => {
    for (const status of ["accepted", "declined", "withdrawn", "canceled", "closed_opportunity_filled"] as const) {
      expect(getEffectiveProposalStatus({ status, expiresAt: "2026-01-01T00:00:00.000Z" }, now)).toBe(status);
    }
  });
});

describe("formatExpiration", () => {
  it("reports 'Expired' once past expiration", () => {
    expect(formatExpiration("2026-01-01T00:00:00.000Z", "2026-01-02T00:00:00.000Z")).toBe("Expired");
  });

  it("reports days remaining when more than a day out", () => {
    expect(formatExpiration("2026-01-05T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe("Expires in 4 days");
  });

  it("reports hours remaining when under a day out", () => {
    expect(formatExpiration("2026-01-01T05:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe("Expires in 5 hours");
  });
});

describe("formatDeadlineDate", () => {
  it("renders a short human date and time", () => {
    const result = formatDeadlineDate("2026-08-18T18:00:00.000Z");
    expect(result).toContain("Aug");
    expect(result).toContain("18");
  });
});
