import { computeBookingDurationMinutes, formatTimeRange } from "./bookingConstraints";
import type {
  BookingProposalAttachment,
  BookingProposalKind,
} from "@/lib/types/vendors";

/**
 * Composing and validating the structured offers a venue owner can send in a
 * booking thread — revised terms, or a deposit request.
 *
 * Pure by design (see the vendor-layer convention in CLAUDE.md): nothing here
 * reads storage, so the rules are unit-testable without a browser.
 *
 * On money: Foundry processes none. A deposit request is a written ask that
 * the parties settle off-platform, and `formatProposalFootnote` is the copy
 * that has to accompany every rendering of one. Don't drop it.
 */

export interface ProposalDraft {
  kind: BookingProposalKind;
  startTime: string;
  endTime: string;
  hourlyRate: string;
  depositAmount: string;
  dueDate: string;
  note: string;
}

export function getEmptyProposalDraft(kind: BookingProposalKind): ProposalDraft {
  return {
    kind,
    startTime: "",
    endTime: "",
    hourlyRate: "",
    depositAmount: "",
    dueDate: "",
    note: "",
  };
}

function toPositiveNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

/**
 * Total for a revised window at a revised rate. Null whenever either input is
 * missing — an "estimated total" computed from half the inputs is worse than
 * none, because it reads as a quote.
 */
export function computeEstimatedTotal(
  startTime: string | null,
  endTime: string | null,
  hourlyRate: number | null
): number | null {
  if (!startTime || !endTime || hourlyRate === null) return null;
  const minutes = computeBookingDurationMinutes(startTime, endTime);
  if (minutes === null || minutes <= 0) return null;
  return Math.round((minutes / 60) * hourlyRate);
}

/** Validation errors, keyed by draft field. Empty object means the draft is sendable. */
export function validateProposalDraft(draft: ProposalDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  const hasStart = Boolean(draft.startTime);
  const hasEnd = Boolean(draft.endTime);
  if (hasStart !== hasEnd) {
    errors.endTime = "Set both a start and an end time, or neither.";
  }
  if (hasStart && hasEnd && computeBookingDurationMinutes(draft.startTime, draft.endTime) === 0) {
    errors.endTime = "Start and end time can't be identical.";
  }

  if (draft.hourlyRate && toPositiveNumber(draft.hourlyRate) === null) {
    errors.hourlyRate = "Enter a rate above zero.";
  }

  if (draft.kind === "deposit_request") {
    if (toPositiveNumber(draft.depositAmount) === null) {
      errors.depositAmount = "Enter the deposit amount you're asking for.";
    }
  }

  if (draft.kind === "revised_terms" && !hasStart && !draft.hourlyRate) {
    errors.startTime = "Change the time, the rate, or both.";
  }

  if (!draft.note.trim()) {
    errors.note = "Add a short note explaining the change.";
  }

  return errors;
}

/** Builds the stored attachment. Call only after validateProposalDraft passes. */
export function buildProposalAttachment(draft: ProposalDraft): BookingProposalAttachment {
  const startTime = draft.startTime || null;
  const endTime = draft.endTime || null;
  const hourlyRate = draft.hourlyRate ? toPositiveNumber(draft.hourlyRate) : null;

  return {
    kind: draft.kind,
    startTime,
    endTime,
    hourlyRate,
    estimatedTotal: computeEstimatedTotal(startTime, endTime, hourlyRate),
    depositAmount: draft.depositAmount ? toPositiveNumber(draft.depositAmount) : null,
    dueDate: draft.dueDate || null,
    note: draft.note.trim(),
    status: "sent",
    respondedAt: null,
  };
}

/** One-line summary used for the notification body and the thread preview. */
export function summarizeProposal(proposal: BookingProposalAttachment): string {
  if (proposal.kind === "deposit_request") {
    const amount = proposal.depositAmount !== null ? `$${proposal.depositAmount.toLocaleString()}` : "a deposit";
    return proposal.dueDate ? `Deposit request: ${amount} by ${proposal.dueDate}` : `Deposit request: ${amount}`;
  }

  const parts: string[] = [];
  if (proposal.startTime && proposal.endTime) {
    parts.push(formatTimeRange(proposal.startTime, proposal.endTime));
  }
  if (proposal.hourlyRate !== null) parts.push(`$${proposal.hourlyRate}/hr`);
  return parts.length > 0 ? `Updated terms: ${parts.join(" · ")}` : "Updated terms";
}

/**
 * The disclaimer that must accompany any rendered proposal.
 *
 * TODO(payments): replace when Phase 7 lands a real payment integration. Until
 * then this is the only thing stopping a deposit request from reading like an
 * invoice Foundry will collect.
 */
export function formatProposalFootnote(kind: BookingProposalKind): string {
  return kind === "deposit_request"
    ? "Foundry doesn't collect payments yet — arrange this directly with the host. Accepting records that you agreed to the amount, nothing more."
    : "Accepting records that you agreed to these terms on Foundry. It doesn't change the booking automatically — the host still updates the listing.";
}

export function isProposalOpen(proposal: BookingProposalAttachment): boolean {
  return proposal.status === "sent";
}

export interface EffectiveBookingTerms {
  startTime: string;
  endTime: string;
  /** Null when the venue only publishes a rate *range* and nothing has pinned it down. */
  hourlyRate: number | null;
  estimatedTotal: number | null;
  /** True once an accepted revised-terms proposal has overridden the original booking. */
  updatedFromProposal: boolean;
  /** ISO of the acceptance these terms came from. Null while the booking is unchanged. */
  acceptedAt: string | null;
}

/**
 * What the booking's terms actually are right now: the original request, with
 * the most recently *accepted* revised-terms proposal layered on top.
 *
 * Deliberately derived rather than written back onto the `Booking`. Accepting
 * a proposal records agreement between two people; it doesn't silently
 * rewrite the booking row, and `Booking` still has no price column (see
 * CLAUDE.md). Recomputing from the thread keeps one source of truth and means
 * a decline can never leave a half-applied change behind.
 *
 * Deposit requests are ignored here — they ask for money against the existing
 * terms, they don't change them.
 */
export function resolveEffectiveBookingTerms(
  base: { startTime: string; endTime: string; hourlyRate: number | null },
  proposals: BookingProposalAttachment[]
): EffectiveBookingTerms {
  const accepted = proposals
    .filter((proposal) => proposal.kind === "revised_terms" && proposal.status === "accepted")
    // Latest acceptance wins, so a second round of terms supersedes the first.
    .sort((a, b) => (a.respondedAt ?? "").localeCompare(b.respondedAt ?? ""));

  const latest = accepted[accepted.length - 1];

  if (!latest) {
    return {
      startTime: base.startTime,
      endTime: base.endTime,
      hourlyRate: base.hourlyRate,
      estimatedTotal: computeEstimatedTotal(base.startTime, base.endTime, base.hourlyRate),
      updatedFromProposal: false,
      acceptedAt: null,
    };
  }

  // A proposal can change the window, the rate, or both — carry through
  // whatever it left unset.
  const startTime = latest.startTime ?? base.startTime;
  const endTime = latest.endTime ?? base.endTime;
  const hourlyRate = latest.hourlyRate ?? base.hourlyRate;

  return {
    startTime,
    endTime,
    hourlyRate,
    estimatedTotal: computeEstimatedTotal(startTime, endTime, hourlyRate),
    updatedFromProposal: true,
    acceptedAt: latest.respondedAt,
  };
}
