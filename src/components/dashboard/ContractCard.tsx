"use client";

import { useState } from "react";
import { formatContractFootnote } from "@/lib/spaces/bookingContracts";
import { formatEventDate } from "@/lib/spaces/bookings";
import type { BookingContractAttachment } from "@/lib/types/vendors";

const STATUS_LABEL: Record<BookingContractAttachment["status"], string> = {
  sent: "Awaiting your signature",
  signed: "Signed by both parties",
  declined: "Declined",
  withdrawn: "Withdrawn by the host",
};

const STATUS_CLASS: Record<BookingContractAttachment["status"], string> = {
  sent: "bg-paper-dim text-ink-soft",
  signed: "bg-brass/20 text-brass-dark",
  declined: "bg-wine/10 text-wine",
  withdrawn: "bg-paper-dim text-ink-soft/70",
};

function formatSignedAt(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

/**
 * A formal agreement inside the booking thread: the host's terms, their typed
 * signature, and the planner's countersignature.
 *
 * The footnote must render on every state. Without it a typed name on a page
 * that looks like a contract reads as an executed legal instrument, which this
 * explicitly is not — see bookingContracts.ts and CLAUDE.md #7.
 */
export default function ContractCard({
  contract,
  hostName,
  canSign,
  canWithdraw,
  onSign,
  onDecline,
  onWithdraw,
}: {
  contract: BookingContractAttachment;
  hostName: string;
  /** True only for the planner, and only while the contract is still open. */
  canSign: boolean;
  /** True only for the host who sent it, and only while it's still open. */
  canWithdraw: boolean;
  onSign: (signature: string) => void;
  onDecline: (reason: string) => void;
  onWithdraw: () => void;
}) {
  const [signature, setSignature] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  return (
    <div className="rounded-xl border border-brass/50 bg-paper p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-brass-dark">Agreement</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[contract.status]}`}>
          {STATUS_LABEL[contract.status]}
        </span>
      </div>

      <p className="mt-2 font-display text-base font-semibold text-ink">{contract.title}</p>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{contract.scope}</p>

      <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm text-ink">
        {contract.totalAmount !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Total</dt>
            <dd className="font-medium">${contract.totalAmount.toLocaleString()}</dd>
          </div>
        )}
        {contract.depositAmount !== null && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Deposit</dt>
            <dd className="font-medium">${contract.depositAmount.toLocaleString()}</dd>
          </div>
        )}
        {contract.balanceDueDate && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Balance due</dt>
            <dd className="font-medium">{formatEventDate(contract.balanceDueDate)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 border-t border-line pt-3">
        <p className="text-xs font-medium text-ink-soft">Cancellation</p>
        <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink">{contract.cancellationPolicy}</p>
      </div>

      {contract.additionalTerms && (
        <div className="mt-3">
          <p className="text-xs font-medium text-ink-soft">Additional terms</p>
          <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink">{contract.additionalTerms}</p>
        </div>
      )}

      <div className="mt-3 grid gap-2 border-t border-line pt-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs text-ink-soft">Host</p>
          <p className="font-display text-base italic text-ink">{contract.hostSignature}</p>
          <p className="text-[11px] text-ink-soft">Signed {formatSignedAt(contract.hostSignedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Organizer</p>
          {contract.organizerSignature ? (
            <>
              <p className="font-display text-base italic text-ink">{contract.organizerSignature}</p>
              <p className="text-[11px] text-ink-soft">
                Signed {contract.organizerSignedAt ? formatSignedAt(contract.organizerSignedAt) : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">Not signed yet</p>
          )}
        </div>
      </div>

      {contract.status === "declined" && contract.declineReason && (
        <p className="mt-3 rounded-lg bg-wine/5 px-3 py-2 text-sm text-ink-soft">
          Declined: {contract.declineReason}
        </p>
      )}

      {canSign && contract.status === "sent" && !declining && (
        <div className="mt-3 border-t border-line pt-3">
          <label htmlFor="contract-signature" className="block text-xs font-medium text-ink-soft">
            Type your full name to sign
          </label>
          <input
            id="contract-signature"
            type="text"
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            placeholder="Your full name"
            className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setDeclining(true)}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => onSign(signature)}
              disabled={signature.trim().length < 2}
              className="flex-1 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign agreement
            </button>
          </div>
        </div>
      )}

      {canSign && contract.status === "sent" && declining && (
        <div className="mt-3 border-t border-line pt-3">
          <label htmlFor="contract-decline" className="block text-xs font-medium text-ink-soft">
            What would you need changed? {hostName} can revise and resend.
          </label>
          <textarea
            id="contract-decline"
            rows={2}
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            className="mt-1 w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => onDecline(declineReason)}
              className="flex-1 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Send decline
            </button>
          </div>
        </div>
      )}

      {canWithdraw && contract.status === "sent" && (
        <button
          type="button"
          onClick={onWithdraw}
          className="mt-3 w-full rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Withdraw this agreement
        </button>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">{formatContractFootnote()}</p>
    </div>
  );
}
