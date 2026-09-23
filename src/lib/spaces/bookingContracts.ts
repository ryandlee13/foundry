import type { BookingContractAttachment } from "@/lib/types/vendors";

/**
 * Composing, validating, and signing the formal agreements a venue operator
 * sends through Foundry.
 *
 * This is the last thing that used to force a planner off the platform: even
 * with terms agreed in-thread, papering the booking meant a PDF over email. A
 * contract here is written by the host, countersigned by the planner in-app,
 * and stays attached to the booking thread as the record.
 *
 * Pure by design (see the vendor-layer convention in CLAUDE.md): nothing here
 * reads storage. Storage mutation lives in messages.ts.
 *
 * TWO THINGS THIS IS NOT:
 *  - Legal advice, or a claim of enforceability. It records that two people put
 *    their names to this text on Foundry on a date — the same line AgreedTerms
 *    holds (CLAUDE.md #7). formatContractFootnote() carries that qualification
 *    and must render with every contract. TODO(legal): real contract templates
 *    and e-signature need counsel review before any real launch.
 *  - A payment. Foundry collects nothing (Phase 7). Amounts stated in a
 *    contract are settled off-platform, and there is deliberately no `paidAt`.
 */

export interface ContractDraft {
  title: string;
  scope: string;
  totalAmount: string;
  depositAmount: string;
  balanceDueDate: string;
  cancellationPolicy: string;
  additionalTerms: string;
  /** The host's typed full name — their signature on this document. */
  hostSignature: string;
}

export function getEmptyContractDraft(seed?: {
  title?: string;
  scope?: string;
  totalAmount?: number | null;
  depositAmount?: number | null;
}): ContractDraft {
  return {
    title: seed?.title ?? "",
    scope: seed?.scope ?? "",
    totalAmount: seed?.totalAmount != null ? String(seed.totalAmount) : "",
    depositAmount: seed?.depositAmount != null ? String(seed.depositAmount) : "",
    balanceDueDate: "",
    cancellationPolicy: "",
    additionalTerms: "",
    hostSignature: "",
  };
}

function toPositiveNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

/** Validation errors keyed by draft field. Empty object means the draft is sendable. */
export function validateContractDraft(draft: ContractDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (draft.title.trim().length < 3) {
    errors.title = "Give this agreement a title.";
  }
  if (draft.scope.trim().length < 20) {
    errors.scope = "Describe what you're providing in a sentence or two.";
  }
  if (!draft.cancellationPolicy.trim()) {
    errors.cancellationPolicy = "State your cancellation policy — this is the term planners ask about most.";
  }

  if (draft.totalAmount && toPositiveNumber(draft.totalAmount) === null) {
    errors.totalAmount = "Enter an amount above zero, or leave it blank.";
  }
  if (draft.depositAmount && toPositiveNumber(draft.depositAmount) === null) {
    errors.depositAmount = "Enter an amount above zero, or leave it blank.";
  }

  const total = toPositiveNumber(draft.totalAmount);
  const deposit = toPositiveNumber(draft.depositAmount);
  if (total !== null && deposit !== null && deposit > total) {
    errors.depositAmount = "The deposit can't be more than the total.";
  }

  if (draft.balanceDueDate && !deposit && !total) {
    errors.balanceDueDate = "A balance due date needs an amount to go with it.";
  }

  // A contract nobody signed isn't a contract. The host signs as they send.
  if (draft.hostSignature.trim().length < 2) {
    errors.hostSignature = "Type your full name to sign.";
  }

  return errors;
}

/** Builds the stored attachment, already signed by the host. Call only after validateContractDraft passes. */
export function buildContract(draft: ContractDraft, signedAtIso: string): BookingContractAttachment {
  return {
    title: draft.title.trim(),
    scope: draft.scope.trim(),
    totalAmount: draft.totalAmount ? toPositiveNumber(draft.totalAmount) : null,
    depositAmount: draft.depositAmount ? toPositiveNumber(draft.depositAmount) : null,
    balanceDueDate: draft.balanceDueDate || null,
    cancellationPolicy: draft.cancellationPolicy.trim(),
    additionalTerms: draft.additionalTerms.trim(),
    hostSignature: draft.hostSignature.trim(),
    hostSignedAt: signedAtIso,
    organizerSignature: null,
    organizerSignedAt: null,
    status: "sent",
    declinedAt: null,
    declineReason: null,
  };
}

/** One-line summary used for the notification body and the log preview. */
export function summarizeContract(contract: BookingContractAttachment): string {
  const amount = contract.totalAmount !== null ? ` · $${contract.totalAmount.toLocaleString()}` : "";
  return `${contract.title}${amount}`;
}

export function isContractOpen(contract: BookingContractAttachment): boolean {
  return contract.status === "sent";
}

/**
 * The disclaimer that must accompany any rendered contract.
 *
 * Without it, a typed-name signature on a page that looks like a contract reads
 * as an executed legal instrument, which it is not. Keep it on every state of
 * the card — unsigned, signed, and declined.
 */
export function formatContractFootnote(): string {
  return "Signing records that both parties put their names to this agreement on Foundry on the dates shown. Foundry isn't a party to it, doesn't provide legal advice, and doesn't collect the amounts stated — settle those directly with the host.";
}

export interface ContractState {
  /** The countersigned agreement in force, if any. */
  signed: BookingContractAttachment | null;
  /** A contract sent and still waiting on the planner. */
  awaitingSignature: BookingContractAttachment | null;
}

/**
 * Which contract (if any) governs this booking right now.
 *
 * Latest signature wins, so a replacement agreement supersedes an earlier one —
 * the same "derive from the log, never write back" rule the terms resolvers
 * follow. A contract can be both absent from `signed` and present in
 * `awaitingSignature`, which is the normal state between sending and signing.
 */
export function resolveContractState(contracts: BookingContractAttachment[]): ContractState {
  const signed = contracts
    .filter((contract) => contract.status === "signed")
    .sort((a, b) => (a.organizerSignedAt ?? "").localeCompare(b.organizerSignedAt ?? ""));

  const open = contracts
    .filter((contract) => contract.status === "sent")
    .sort((a, b) => a.hostSignedAt.localeCompare(b.hostSignedAt));

  return {
    signed: signed[signed.length - 1] ?? null,
    awaitingSignature: open[open.length - 1] ?? null,
  };
}
