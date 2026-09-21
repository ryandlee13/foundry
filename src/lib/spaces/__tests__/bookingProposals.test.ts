import { describe, expect, it } from "vitest";
import {
  buildProposalAttachment,
  computeEstimatedTotal,
  formatProposalFootnote,
  getEmptyProposalDraft,
  resolveEffectiveBookingTerms,
  summarizeProposal,
  validateProposalDraft,
  type ProposalDraft,
} from "../bookingProposals";

function draft(overrides: Partial<ProposalDraft> = {}): ProposalDraft {
  return { ...getEmptyProposalDraft("revised_terms"), note: "Shifting an hour later.", ...overrides };
}

describe("computeEstimatedTotal", () => {
  it("multiplies the revised window by the revised rate", () => {
    expect(computeEstimatedTotal("18:00", "22:00", 150)).toBe(600);
  });

  it("handles a window that crosses midnight", () => {
    expect(computeEstimatedTotal("22:00", "02:00", 100)).toBe(400);
  });

  it("returns null when any input is missing", () => {
    // A total computed from half the inputs reads as a quote — worse than none.
    expect(computeEstimatedTotal(null, "22:00", 150)).toBeNull();
    expect(computeEstimatedTotal("18:00", null, 150)).toBeNull();
    expect(computeEstimatedTotal("18:00", "22:00", null)).toBeNull();
  });
});

describe("validateProposalDraft", () => {
  it("accepts a revised-terms draft with just a time change", () => {
    expect(validateProposalDraft(draft({ startTime: "18:00", endTime: "22:00" }))).toEqual({});
  });

  it("accepts a revised-terms draft with just a rate change", () => {
    expect(validateProposalDraft(draft({ hourlyRate: "175" }))).toEqual({});
  });

  it("rejects revised terms that change nothing", () => {
    expect(validateProposalDraft(draft()).startTime).toBeTruthy();
  });

  it("requires both times or neither", () => {
    expect(validateProposalDraft(draft({ startTime: "18:00" })).endTime).toBeTruthy();
    expect(validateProposalDraft(draft({ endTime: "22:00" })).endTime).toBeTruthy();
  });

  it("rejects an identical start and end time", () => {
    expect(validateProposalDraft(draft({ startTime: "18:00", endTime: "18:00" })).endTime).toBeTruthy();
  });

  it("rejects a non-positive rate", () => {
    expect(validateProposalDraft(draft({ hourlyRate: "0" })).hourlyRate).toBeTruthy();
    expect(validateProposalDraft(draft({ hourlyRate: "-5" })).hourlyRate).toBeTruthy();
  });

  it("requires an amount on a deposit request", () => {
    const deposit = { ...getEmptyProposalDraft("deposit_request"), note: "Holds the date." };
    expect(validateProposalDraft(deposit).depositAmount).toBeTruthy();
    expect(validateProposalDraft({ ...deposit, depositAmount: "500" })).toEqual({});
  });

  it("always requires a note", () => {
    expect(validateProposalDraft(draft({ startTime: "18:00", endTime: "22:00", note: "  " })).note).toBeTruthy();
  });
});

describe("buildProposalAttachment", () => {
  it("starts every proposal open and unanswered", () => {
    const attachment = buildProposalAttachment(draft({ startTime: "18:00", endTime: "22:00", hourlyRate: "150" }));
    expect(attachment.status).toBe("sent");
    expect(attachment.respondedAt).toBeNull();
    expect(attachment.estimatedTotal).toBe(600);
  });

  it("normalizes blank fields to null rather than empty strings", () => {
    const attachment = buildProposalAttachment(draft({ hourlyRate: "175" }));
    expect(attachment.startTime).toBeNull();
    expect(attachment.endTime).toBeNull();
    expect(attachment.dueDate).toBeNull();
    expect(attachment.depositAmount).toBeNull();
    expect(attachment.estimatedTotal).toBeNull();
  });

  it("trims the note", () => {
    expect(buildProposalAttachment(draft({ hourlyRate: "175", note: "  hi  " })).note).toBe("hi");
  });
});

describe("summarizeProposal", () => {
  it("summarizes revised terms in 12-hour time", () => {
    const attachment = buildProposalAttachment(draft({ startTime: "18:00", endTime: "22:00", hourlyRate: "150" }));
    // Never military time in user-facing strings — see CLAUDE.md.
    expect(summarizeProposal(attachment)).toContain("6:00 PM");
    expect(summarizeProposal(attachment)).toContain("$150/hr");
  });

  it("summarizes a deposit request with its amount", () => {
    const attachment = buildProposalAttachment({
      ...getEmptyProposalDraft("deposit_request"),
      depositAmount: "1500",
      note: "Holds the date.",
    });
    expect(summarizeProposal(attachment)).toContain("$1,500");
  });
});

describe("formatProposalFootnote", () => {
  it("never claims Foundry collects the deposit", () => {
    const footnote = formatProposalFootnote("deposit_request");
    expect(footnote).toContain("doesn't collect payments yet");
    expect(footnote.toLowerCase()).not.toContain("charged");
  });

  it("does not claim accepting changes the booking", () => {
    expect(formatProposalFootnote("revised_terms")).toContain("doesn't change the booking automatically");
  });
});

describe("resolveEffectiveBookingTerms", () => {
  const base = { startTime: "18:00", endTime: "22:00", hourlyRate: 150 };

  function accepted(overrides: Partial<ProposalDraft>, respondedAt: string) {
    return {
      ...buildProposalAttachment(draft(overrides)),
      status: "accepted" as const,
      respondedAt,
    };
  }

  it("returns the original booking when nothing was accepted", () => {
    const terms = resolveEffectiveBookingTerms(base, []);
    expect(terms.startTime).toBe("18:00");
    expect(terms.hourlyRate).toBe(150);
    expect(terms.estimatedTotal).toBe(600);
    expect(terms.updatedFromProposal).toBe(false);
    expect(terms.acceptedAt).toBeNull();
  });

  it("ignores a proposal that is still open or was declined", () => {
    const open = buildProposalAttachment(draft({ hourlyRate: "999" }));
    const declined = { ...buildProposalAttachment(draft({ hourlyRate: "888" })), status: "declined" as const };
    const terms = resolveEffectiveBookingTerms(base, [open, declined]);
    expect(terms.hourlyRate).toBe(150);
    expect(terms.updatedFromProposal).toBe(false);
  });

  it("applies an accepted rate change and recomputes the total", () => {
    const terms = resolveEffectiveBookingTerms(base, [
      accepted({ hourlyRate: "200" }, "2026-09-20T10:00:00.000Z"),
    ]);
    expect(terms.hourlyRate).toBe(200);
    expect(terms.startTime).toBe("18:00");
    expect(terms.estimatedTotal).toBe(800);
    expect(terms.updatedFromProposal).toBe(true);
    expect(terms.acceptedAt).toBe("2026-09-20T10:00:00.000Z");
  });

  it("carries through fields the proposal left unset", () => {
    // Time-only change keeps the original rate, and vice versa.
    const timeOnly = resolveEffectiveBookingTerms(base, [
      accepted({ startTime: "19:00", endTime: "23:00" }, "2026-09-20T10:00:00.000Z"),
    ]);
    expect(timeOnly.startTime).toBe("19:00");
    expect(timeOnly.hourlyRate).toBe(150);
    expect(timeOnly.estimatedTotal).toBe(600);
  });

  it("lets the latest acceptance supersede an earlier one", () => {
    const terms = resolveEffectiveBookingTerms(base, [
      accepted({ hourlyRate: "200" }, "2026-09-20T10:00:00.000Z"),
      accepted({ hourlyRate: "175" }, "2026-09-21T10:00:00.000Z"),
    ]);
    expect(terms.hourlyRate).toBe(175);
    expect(terms.acceptedAt).toBe("2026-09-21T10:00:00.000Z");
  });

  it("is unaffected by an accepted deposit request", () => {
    const deposit = {
      ...buildProposalAttachment({
        ...getEmptyProposalDraft("deposit_request"),
        depositAmount: "500",
        note: "Holds the date.",
      }),
      status: "accepted" as const,
      respondedAt: "2026-09-22T10:00:00.000Z",
    };
    const terms = resolveEffectiveBookingTerms(base, [deposit]);
    expect(terms.hourlyRate).toBe(150);
    expect(terms.updatedFromProposal).toBe(false);
  });

  it("leaves the total null when the venue only publishes a rate range", () => {
    const terms = resolveEffectiveBookingTerms({ ...base, hourlyRate: null }, []);
    expect(terms.hourlyRate).toBeNull();
    expect(terms.estimatedTotal).toBeNull();
  });
});
