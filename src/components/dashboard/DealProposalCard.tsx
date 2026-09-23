"use client";

import { formatDealAmount, formatDealProposalFootnote } from "@/lib/vendors/dealProposals";
import type { DealProposalAttachment } from "@/lib/types/vendors";

const STATUS_LABEL: Record<DealProposalAttachment["status"], string> = {
  sent: "Awaiting response",
  accepted: "Agreed",
  declined: "Declined",
  superseded: "Replaced by a newer round",
};

const STATUS_CLASS: Record<DealProposalAttachment["status"], string> = {
  sent: "bg-paper-dim text-ink-soft",
  accepted: "bg-brass/20 text-brass-dark",
  declined: "bg-wine/10 text-wine",
  superseded: "bg-paper-dim text-ink-soft/70",
};

/**
 * One round of vendor deal terms in the proposal log.
 *
 * The footnote is not decoration — an accepted round is agreement on a number,
 * not a booked vendor, and this is the only thing that says so. Keep it on
 * every state of the card.
 */
export default function DealProposalCard({
  proposal,
  senderName,
  isMine,
  canRespond,
  onRespond,
}: {
  proposal: DealProposalAttachment;
  senderName: string;
  isMine: boolean;
  /** True only for the side that didn't send it, and only while it's still open. */
  canRespond: boolean;
  onRespond: (status: "accepted" | "declined") => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-left ${
        proposal.status === "superseded" ? "border-line bg-paper-dim/50 opacity-70" : "border-brass/50 bg-paper"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brass-dark">
          {isMine ? "You proposed" : `${senderName} proposed`}
        </p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[proposal.status]}`}>
          {STATUS_LABEL[proposal.status]}
        </span>
      </div>

      <p className="mt-2 font-display text-lg font-semibold text-ink">
        {formatDealAmount(proposal.amount, proposal.pricingModel)}
      </p>

      <dl className="mt-2 text-sm">
        <dt className="text-xs font-medium text-ink-soft">What&apos;s included</dt>
        <dd className="mt-0.5 leading-relaxed text-ink">{proposal.deliverables}</dd>
      </dl>

      <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">{proposal.note}</p>

      {canRespond && proposal.status === "sent" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onRespond("declined")}
            className="flex-1 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => onRespond("accepted")}
            className="flex-1 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Accept terms
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">{formatDealProposalFootnote()}</p>
    </div>
  );
}
