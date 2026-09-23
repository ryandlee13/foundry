import { PRICING_MODEL_LABELS } from "./labels";
import type { DealProposalAttachment, PricingModel } from "@/lib/types/vendors";

/**
 * Composing and validating rounds of vendor deal terms — the back-and-forth a
 * planner and a vendor run before anyone commits.
 *
 * Before this existed, a vendor bid once and the planner got exactly one edit,
 * at finalize time. Anything in between happened over text or email, which is
 * the specific behaviour this is meant to remove.
 *
 * Pure by design (see the vendor-layer convention in CLAUDE.md): nothing here
 * reads storage, so the rules are unit-testable without a browser. Storage
 * mutation lives in messages.ts; committing lives in engagements.ts.
 *
 * On money: accepting a round records agreement on a number. It does not create
 * an engagement and it does not move money (Phase 7) — finalizeDeal() is still
 * the only thing that commits, and formatDealProposalFootnote() is the copy
 * that has to say so wherever a round is rendered.
 */

/** Only these two are offerable. Matches the vendor-request form's choices — day rates and packages have no request-side counterpart to negotiate against. */
export const NEGOTIABLE_PRICING_MODELS: PricingModel[] = ["hourly", "flat_fee"];

export interface DealProposalDraft {
  amount: string;
  pricingModel: PricingModel;
  deliverables: string;
  note: string;
}

export function getEmptyDealProposalDraft(base?: {
  amount: number;
  pricingModel: PricingModel;
  deliverables: string;
}): DealProposalDraft {
  return {
    amount: base ? String(base.amount) : "",
    pricingModel: base?.pricingModel ?? "flat_fee",
    deliverables: base?.deliverables ?? "",
    note: "",
  };
}

function toPositiveNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

/** Validation errors keyed by draft field. Empty object means the draft is sendable. */
export function validateDealProposalDraft(draft: DealProposalDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (toPositiveNumber(draft.amount) === null) {
    errors.amount = "Enter an amount above zero.";
  }
  if (!draft.deliverables.trim()) {
    errors.deliverables = "Say what's included at this price.";
  }
  if (!draft.note.trim()) {
    errors.note = "Add a short note explaining the change.";
  }

  return errors;
}

/** Builds the stored attachment. Call only after validateDealProposalDraft passes. */
export function buildDealProposal(
  draft: DealProposalDraft,
  senderRole: DealProposalAttachment["senderRole"]
): DealProposalAttachment {
  return {
    amount: toPositiveNumber(draft.amount) ?? 0,
    pricingModel: draft.pricingModel,
    deliverables: draft.deliverables.trim(),
    note: draft.note.trim(),
    senderRole,
    status: "sent",
    respondedAt: null,
  };
}

export function formatDealAmount(amount: number, pricingModel: PricingModel): string {
  const label = PRICING_MODEL_LABELS[pricingModel].toLowerCase();
  return pricingModel === "hourly" ? `$${amount.toLocaleString()}/hr` : `$${amount.toLocaleString()} ${label}`;
}

/** One-line summary used for the notification body and the log preview. */
export function summarizeDealProposal(proposal: DealProposalAttachment): string {
  const who = proposal.senderRole === "organizer" ? "Organizer" : "Vendor";
  return `${who} proposed ${formatDealAmount(proposal.amount, proposal.pricingModel)}`;
}

/**
 * The disclaimer that must accompany any rendered round.
 *
 * TODO(payments): revisit when Phase 7 lands a real payment integration. Until
 * then this is the only thing stopping an accepted round from reading like a
 * signed deal.
 */
export function formatDealProposalFootnote(): string {
  return "Accepting records that you agreed to these terms on Foundry. The deal isn't final until the organizer finalizes it and the vendor confirms.";
}

export function isDealProposalOpen(proposal: DealProposalAttachment): boolean {
  return proposal.status === "sent";
}

/**
 * Pure: marks every still-open round as superseded.
 *
 * Called when a new round is sent. Without it a stale counter stays acceptable
 * indefinitely, so both sides could accept two different sets of terms and each
 * believe theirs is the agreement.
 */
export function supersedeOpenRounds(proposals: DealProposalAttachment[]): DealProposalAttachment[] {
  return proposals.map((proposal) =>
    proposal.status === "sent" ? { ...proposal, status: "superseded" as const } : proposal
  );
}

export interface EffectiveDealTerms {
  amount: number;
  pricingModel: PricingModel;
  deliverables: string;
  /** True once an accepted round has superseded the vendor's original bid. */
  negotiated: boolean;
  /** Which side's round was accepted. Null while nothing has been agreed. */
  agreedFrom: DealProposalAttachment["senderRole"] | null;
}

/**
 * What the two sides have actually agreed to right now: the vendor's original
 * bid, with the most recently *accepted* round layered on top.
 *
 * Derived rather than written back onto the proposal, for the same reason
 * resolveEffectiveBookingTerms() is: a negotiation log is a record of what was
 * said, and recomputing from it means a decline can never leave a half-applied
 * change behind. finalizeDeal() reads this to pre-fill the terms it locks.
 */
export function resolveEffectiveDealTerms(
  base: { amount: number; pricingModel: PricingModel; deliverables: string },
  proposals: DealProposalAttachment[]
): EffectiveDealTerms {
  const accepted = proposals
    .filter((proposal) => proposal.status === "accepted")
    // Latest acceptance wins, so a second round supersedes the first.
    .sort((a, b) => (a.respondedAt ?? "").localeCompare(b.respondedAt ?? ""));

  const latest = accepted[accepted.length - 1];
  if (!latest) {
    return { ...base, negotiated: false, agreedFrom: null };
  }

  return {
    amount: latest.amount,
    pricingModel: latest.pricingModel,
    deliverables: latest.deliverables,
    negotiated: true,
    agreedFrom: latest.senderRole,
  };
}
