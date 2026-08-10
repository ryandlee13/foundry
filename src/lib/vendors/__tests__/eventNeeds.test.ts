import { describe, expect, it } from "vitest";
import { canFillPosition, computeFilledPosition, computeEventNeedPhase, formatNeedEventLabel } from "../eventNeeds";
import type { ProposalStatus } from "@/lib/types/vendors";

describe("canFillPosition (over-acceptance guard)", () => {
  it("allows filling when positions remain", () => {
    expect(canFillPosition({ positionsFilled: 1, positionsAvailable: 3 })).toBe(true);
  });

  it("blocks filling once positions are exhausted", () => {
    expect(canFillPosition({ positionsFilled: 3, positionsAvailable: 3 })).toBe(false);
  });

  it("blocks filling if somehow already over capacity", () => {
    expect(canFillPosition({ positionsFilled: 4, positionsAvailable: 3 })).toBe(false);
  });
});

describe("computeFilledPosition", () => {
  it("increments positionsFilled and keeps status when positions remain", () => {
    const result = computeFilledPosition({ positionsFilled: 0, positionsAvailable: 2, status: "published" });
    expect(result).toEqual({ positionsFilled: 1, status: "published" });
  });

  it("auto-closes to 'filled' once the last position is taken", () => {
    const result = computeFilledPosition({ positionsFilled: 1, positionsAvailable: 2, status: "published" });
    expect(result).toEqual({ positionsFilled: 2, status: "filled" });
  });

  it("marks filled immediately for single-position needs", () => {
    const result = computeFilledPosition({ positionsFilled: 0, positionsAvailable: 1, status: "published" });
    expect(result).toEqual({ positionsFilled: 1, status: "filled" });
  });
});

function proposals(...statuses: ProposalStatus[]) {
  return statuses.map((status) => ({ status }));
}

describe("computeEventNeedPhase", () => {
  it("is 'canceled' regardless of proposals", () => {
    expect(computeEventNeedPhase({ status: "canceled" }, proposals("submitted"))).toBe("canceled");
  });

  it("is 'closed' regardless of proposals", () => {
    expect(computeEventNeedPhase({ status: "closed" }, proposals("submitted"))).toBe("closed");
  });

  it("is 'finalized' once the need is filled", () => {
    expect(computeEventNeedPhase({ status: "filled" }, [])).toBe("finalized");
  });

  it("is 'finalized' if any proposal was accepted, even if status hasn't caught up", () => {
    expect(computeEventNeedPhase({ status: "published" }, proposals("accepted", "declined"))).toBe("finalized");
  });

  it("is 'not_started' for a draft need", () => {
    expect(computeEventNeedPhase({ status: "draft" }, [])).toBe("not_started");
  });

  it("is 'in_discussion' when a proposal is in discussion", () => {
    expect(computeEventNeedPhase({ status: "published" }, proposals("submitted", "in_discussion"))).toBe("in_discussion");
  });

  it("is 'reviewing_bids' when proposals are submitted or shortlisted but none in discussion", () => {
    expect(computeEventNeedPhase({ status: "published" }, proposals("submitted", "shortlisted"))).toBe("reviewing_bids");
  });

  it("is 'accepting_proposals' when published with no proposals yet", () => {
    expect(computeEventNeedPhase({ status: "published" }, [])).toBe("accepting_proposals");
  });

  it("ignores terminal proposal statuses when deciding reviewing_bids vs accepting_proposals", () => {
    expect(computeEventNeedPhase({ status: "published" }, proposals("withdrawn", "expired"))).toBe("accepting_proposals");
  });
});

describe("formatNeedEventLabel", () => {
  const need = { publicLocation: "Mission District", eventDate: "2026-08-23" };

  it("uses the event name when set", () => {
    expect(formatNeedEventLabel(need, "Foundry Summer Social")).toBe("Foundry Summer Social");
  });

  it("falls back to location + date when the event name is null", () => {
    expect(formatNeedEventLabel(need, null)).toBe("Mission District · 2026-08-23");
  });

  it("falls back when the event name is blank", () => {
    expect(formatNeedEventLabel(need, "   ")).toBe("Mission District · 2026-08-23");
  });
});
