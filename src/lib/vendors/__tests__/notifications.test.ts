import { describe, expect, it } from "vitest";
import { selectRecipientsNeedingNotification } from "../notifications";
import type { AppNotification } from "@/lib/types/vendors";

function makeExisting(overrides: Partial<AppNotification> = {}): Pick<AppNotification, "recipientId" | "type" | "link"> {
  return { recipientId: "vendor-a", type: "new_matching_gig", link: "/dashboard/vendor/gigs/need-1", ...overrides };
}

describe("selectRecipientsNeedingNotification", () => {
  it("notifies every recipient when there's no prior notification", () => {
    const result = selectRecipientsNeedingNotification([], ["a", "b", "c"], "new_matching_gig", "/gigs/1");
    expect(result).toEqual(["a", "b", "c"]);
  });

  it("skips a recipient who already has this exact type+link notification", () => {
    const existing = [makeExisting({ recipientId: "vendor-a" })];
    const result = selectRecipientsNeedingNotification(existing, ["vendor-a", "vendor-b"], "new_matching_gig", "/dashboard/vendor/gigs/need-1");
    expect(result).toEqual(["vendor-b"]);
  });

  it("does not skip when the type differs even for the same link", () => {
    const existing = [makeExisting({ recipientId: "vendor-a", type: "bid_expiring" })];
    const result = selectRecipientsNeedingNotification(existing, ["vendor-a"], "new_matching_gig", "/dashboard/vendor/gigs/need-1");
    expect(result).toEqual(["vendor-a"]);
  });

  it("does not skip when the link differs even for the same type", () => {
    const existing = [makeExisting({ recipientId: "vendor-a", link: "/dashboard/vendor/gigs/need-2" })];
    const result = selectRecipientsNeedingNotification(existing, ["vendor-a"], "new_matching_gig", "/dashboard/vendor/gigs/need-1");
    expect(result).toEqual(["vendor-a"]);
  });

  it("de-duplicates repeated ids within the same candidate list", () => {
    const result = selectRecipientsNeedingNotification([], ["a", "a", "b"], "new_matching_gig", "/gigs/1");
    expect(result).toEqual(["a", "b"]);
  });
});
