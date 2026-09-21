import { describe, expect, it } from "vitest";
import {
  buildProposalAttachment,
  computeEstimatedTotal,
  formatProposalFootnote,
  getEmptyProposalDraft,
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
