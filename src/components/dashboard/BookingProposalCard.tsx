"use client";

import { formatTimeRange } from "@/lib/spaces/bookingConstraints";
import { formatEventDate } from "@/lib/spaces/bookings";
import { formatProposalFootnote } from "@/lib/spaces/bookingProposals";
import type { BookingProposalAttachment } from "@/lib/types/vendors";

const STATUS_LABEL: Record<BookingProposalAttachment["status"], string> = {
  sent: "Awaiting response",
  accepted: "Accepted",
  declined: "Declined",
};

/**
 * Renders a venue owner's structured offer inside a booking thread.
 *
 * The footnote is not decoration — it's the only thing preventing a deposit
 * request from reading like an invoice Foundry will collect. Keep it rendered
 * on every state of this card.
 */
export default function BookingProposalCard({
  proposal,
  canRespond,
  onRespond,
}: {
  proposal: BookingProposalAttachment;
  /** True only for the organizer, and only while the proposal is still open. */
  canRespond: boolean;
  onRespond: (status: "accepted" | "declined") => void;
}) {
  const isDeposit = proposal.kind === "deposit_request";

  return (
    <div className="rounded-xl border border-brass/50 bg-paper p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brass-dark">
          {isDeposit ? "Deposit request" : "Updated proposal"}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            proposal.status === "accepted"
              ? "bg-brass/20 text-brass-dark"
              : proposal.status === "declined"
                ? "bg-wine/10 text-wine"
                : "bg-paper-dim text-ink-soft"
          }`}
        >
          {STATUS_LABEL[proposal.status]}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm text-ink">
        {proposal.startTime && proposal.endTime && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">New time</dt>
            <dd className="font-medium">{formatTimeRange(proposal.startTime, proposal.endTime)}</dd>
          </div>
        )}
        {proposal.hourlyRate !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Hourly rate</dt>
            <dd className="font-medium">${proposal.hourlyRate}/hr</dd>
          </div>
        )}
        {proposal.estimatedTotal !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Estimated total</dt>
            <dd className="font-medium">${proposal.estimatedTotal.toLocaleString()}</dd>
          </div>
        )}
        {proposal.depositAmount !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Deposit requested</dt>
            <dd className="font-medium">${proposal.depositAmount.toLocaleString()}</dd>
          </div>
        )}
        {proposal.dueDate && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Requested by</dt>
            <dd className="font-medium">{formatEventDate(proposal.dueDate)}</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-ink-soft">
        {proposal.note}
      </p>

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
            Accept
          </button>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        {formatProposalFootnote(proposal.kind)}
      </p>
    </div>
  );
}
