import { describe, expect, it } from "vitest";
import { organizerProposalsPath, organizerVendorsPath } from "../organizerRoutes";

describe("organizerVendorsPath", () => {
  it("routes an assigned request under its booking", () => {
    expect(organizerVendorsPath("b-1")).toBe("/dashboard/organizer/bookings/b-1/vendors");
  });

  it("routes an unassigned request to the standalone page", () => {
    // Built by hand, the null case produced ".../bookings/null/vendors" — a
    // 404 that reads like the request was lost.
    expect(organizerVendorsPath(null)).toBe("/dashboard/organizer/vendors");
  });

  it("never emits a literal null segment", () => {
    expect(organizerVendorsPath(null)).not.toContain("null");
    expect(organizerProposalsPath(null, "n-1")).not.toContain("null");
  });
});

describe("organizerProposalsPath", () => {
  it("nests under the booking when there is one", () => {
    expect(organizerProposalsPath("b-1", "n-1")).toBe(
      "/dashboard/organizer/bookings/b-1/vendors/n-1/proposals"
    );
  });

  it("nests under the standalone page when there isn't", () => {
    expect(organizerProposalsPath(null, "n-1")).toBe("/dashboard/organizer/vendors/n-1/proposals");
  });
});
