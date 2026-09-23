import { describe, expect, it } from "vitest";
import {
  buildContract,
  formatContractFootnote,
  getEmptyContractDraft,
  isContractOpen,
  resolveContractState,
  summarizeContract,
  validateContractDraft,
  type ContractDraft,
} from "../bookingContracts";
import type { BookingContractAttachment } from "@/lib/types/vendors";

const validDraft: ContractDraft = {
  title: "Venue rental agreement",
  scope: "Exclusive use of the main room and bar from 6pm to midnight, including staff and setup.",
  totalAmount: "2400",
  depositAmount: "600",
  balanceDueDate: "2026-08-01",
  cancellationPolicy: "Full refund up to 30 days before the event; deposit non-refundable after that.",
  additionalTerms: "",
  hostSignature: "Joseph Wharton",
};

function contract(overrides: Partial<BookingContractAttachment> = {}): BookingContractAttachment {
  return {
    title: "Venue rental agreement",
    scope: "scope",
    totalAmount: 2400,
    depositAmount: 600,
    balanceDueDate: null,
    cancellationPolicy: "policy",
    additionalTerms: "",
    hostSignature: "Joseph Wharton",
    hostSignedAt: "2026-06-01T00:00:00Z",
    organizerSignature: null,
    organizerSignedAt: null,
    status: "sent",
    declinedAt: null,
    declineReason: null,
    ...overrides,
  };
}

describe("validateContractDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateContractDraft(validDraft)).toEqual({});
  });

  it("requires a title", () => {
    expect(validateContractDraft({ ...validDraft, title: "x" }).title).toBeTruthy();
  });

  it("requires a real scope, not one word", () => {
    expect(validateContractDraft({ ...validDraft, scope: "The room." }).scope).toBeTruthy();
  });

  it("requires a cancellation policy", () => {
    expect(validateContractDraft({ ...validDraft, cancellationPolicy: "  " }).cancellationPolicy).toBeTruthy();
  });

  it("requires the host to sign as they send", () => {
    expect(validateContractDraft({ ...validDraft, hostSignature: "" }).hostSignature).toBeTruthy();
  });

  it("allows both amounts to be blank", () => {
    expect(
      validateContractDraft({ ...validDraft, totalAmount: "", depositAmount: "", balanceDueDate: "" })
    ).toEqual({});
  });

  it("rejects a non-numeric or zero amount", () => {
    expect(validateContractDraft({ ...validDraft, totalAmount: "lots" }).totalAmount).toBeTruthy();
    expect(validateContractDraft({ ...validDraft, depositAmount: "0" }).depositAmount).toBeTruthy();
  });

  it("rejects a deposit larger than the total", () => {
    expect(validateContractDraft({ ...validDraft, depositAmount: "5000" }).depositAmount).toBeTruthy();
  });

  it("rejects a due date with no amount attached to it", () => {
    const errors = validateContractDraft({
      ...validDraft,
      totalAmount: "",
      depositAmount: "",
      balanceDueDate: "2026-08-01",
    });
    expect(errors.balanceDueDate).toBeTruthy();
  });
});

describe("buildContract", () => {
  it("builds a host-signed, planner-unsigned contract", () => {
    const built = buildContract(validDraft, "2026-06-01T10:00:00Z");
    expect(built).toMatchObject({
      title: "Venue rental agreement",
      totalAmount: 2400,
      depositAmount: 600,
      balanceDueDate: "2026-08-01",
      hostSignature: "Joseph Wharton",
      hostSignedAt: "2026-06-01T10:00:00Z",
      organizerSignature: null,
      organizerSignedAt: null,
      status: "sent",
    });
  });

  it("stores blank optional amounts as null, not zero", () => {
    const built = buildContract(
      { ...validDraft, totalAmount: "", depositAmount: "", balanceDueDate: "" },
      "2026-06-01T10:00:00Z"
    );
    expect(built.totalAmount).toBeNull();
    expect(built.depositAmount).toBeNull();
    expect(built.balanceDueDate).toBeNull();
  });

  it("has no field that asserts payment — Foundry collects nothing", () => {
    const built = buildContract(validDraft, "2026-06-01T10:00:00Z");
    expect(built).not.toHaveProperty("paidAt");
    expect(Object.keys(built).some((key) => /paid|charged|processed/i.test(key))).toBe(false);
  });
});

describe("getEmptyContractDraft", () => {
  it("returns blanks with no seed", () => {
    expect(getEmptyContractDraft().totalAmount).toBe("");
    expect(getEmptyContractDraft().hostSignature).toBe("");
  });

  it("pre-fills from the terms already agreed in-thread", () => {
    const draft = getEmptyContractDraft({ title: "Rental", totalAmount: 1800, depositAmount: null });
    expect(draft.title).toBe("Rental");
    expect(draft.totalAmount).toBe("1800");
    expect(draft.depositAmount).toBe("");
  });
});

describe("resolveContractState", () => {
  it("reports nothing for an empty log", () => {
    expect(resolveContractState([])).toEqual({ signed: null, awaitingSignature: null });
  });

  it("surfaces a sent contract as awaiting signature", () => {
    const state = resolveContractState([contract()]);
    expect(state.awaitingSignature).not.toBeNull();
    expect(state.signed).toBeNull();
  });

  it("surfaces a countersigned contract as the one in force", () => {
    const state = resolveContractState([
      contract({ status: "signed", organizerSignature: "Ryan Lee", organizerSignedAt: "2026-06-02T00:00:00Z" }),
    ]);
    expect(state.signed?.organizerSignature).toBe("Ryan Lee");
    expect(state.awaitingSignature).toBeNull();
  });

  it("lets the latest signature win when a replacement supersedes an earlier agreement", () => {
    const state = resolveContractState([
      contract({
        title: "Second",
        status: "signed",
        organizerSignature: "Ryan Lee",
        organizerSignedAt: "2026-07-01T00:00:00Z",
      }),
      contract({
        title: "First",
        status: "signed",
        organizerSignature: "Ryan Lee",
        organizerSignedAt: "2026-06-02T00:00:00Z",
      }),
    ]);
    expect(state.signed?.title).toBe("Second");
  });

  it("ignores declined and withdrawn contracts entirely", () => {
    const state = resolveContractState([
      contract({ status: "declined", declinedAt: "2026-06-03T00:00:00Z" }),
      contract({ status: "withdrawn" }),
    ]);
    expect(state).toEqual({ signed: null, awaitingSignature: null });
  });

  it("can report a signed agreement and a newer one still awaiting signature at once", () => {
    const state = resolveContractState([
      contract({ title: "Original", status: "signed", organizerSignedAt: "2026-06-02T00:00:00Z" }),
      contract({ title: "Revised", status: "sent", hostSignedAt: "2026-06-20T00:00:00Z" }),
    ]);
    expect(state.signed?.title).toBe("Original");
    expect(state.awaitingSignature?.title).toBe("Revised");
  });
});

describe("presentation", () => {
  it("summarizes with the amount when one is stated", () => {
    expect(summarizeContract(contract())).toBe("Venue rental agreement · $2,400");
  });

  it("summarizes without an amount when none is stated", () => {
    expect(summarizeContract(contract({ totalAmount: null }))).toBe("Venue rental agreement");
  });

  it("treats only a sent contract as open", () => {
    expect(isContractOpen(contract())).toBe(true);
    expect(isContractOpen(contract({ status: "signed" }))).toBe(false);
  });

  it("disclaims enforceability and payment in the footnote", () => {
    const footnote = formatContractFootnote();
    expect(footnote).toMatch(/legal advice/i);
    expect(footnote).toMatch(/doesn't collect/i);
  });
});
