import { describe, expect, it } from "vitest";
import { summarizeEventVendors } from "../eventVendorSummary";
import type { EngagementStatus, EventNeedStatus } from "@/lib/types/vendors";

function summarize(needStatuses: EventNeedStatus[], engagementStatuses: EngagementStatus[]) {
  return summarizeEventVendors({
    needs: needStatuses.map((status) => ({ status })),
    engagements: engagementStatuses.map((status) => ({ status })),
  });
}

describe("summarizeEventVendors", () => {
  it("says nothing has been asked when there are no requests", () => {
    expect(summarize([], []).headline).toBe("No vendor requests yet");
  });

  it("distinguishes 'never asked' from 'asked and everything closed'", () => {
    // Same empty-looking row, very different situations.
    expect(summarize(["closed", "canceled"], []).headline).toBe("No vendors booked — all requests closed");
  });

  it("counts a vendor awaiting their own confirmation separately from a confirmed one", () => {
    const summary = summarize(["filled", "published"], ["confirmed", "pending_vendor_confirmation"]);
    expect(summary.confirmedCount).toBe(1);
    expect(summary.awaitingVendorCount).toBe(1);
    expect(summary.headline).toBe("1 vendor confirmed · 1 awaiting confirmation · 1 open request");
  });

  it("treats in-progress and completed vendors as confirmed, and declined/canceled as neither", () => {
    const summary = summarize([], ["in_progress", "completed", "declined_by_vendor", "canceled_by_organizer"]);
    expect(summary.confirmedCount).toBe(2);
    expect(summary.awaitingVendorCount).toBe(0);
  });

  it("counts only requests that can still take bids as open", () => {
    const summary = summarize(["draft", "published", "paused", "filled", "closed", "canceled"], []);
    expect(summary.requestCount).toBe(6);
    expect(summary.openRequestCount).toBe(3);
  });

  it("pluralizes", () => {
    expect(summarize(["published", "published"], []).headline).toBe("2 open requests");
    expect(summarize([], ["confirmed", "confirmed"]).headline).toBe("2 vendors confirmed");
  });
});
