"use client";

import { useState } from "react";
import {
  buildProposalAttachment,
  computeEstimatedTotal,
  formatProposalFootnote,
  getEmptyProposalDraft,
  summarizeProposal,
  validateProposalDraft,
  type ProposalDraft,
} from "@/lib/spaces/bookingProposals";
import type { BookingProposalAttachment, BookingProposalKind } from "@/lib/types/vendors";

const FIELD =
  "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";
const LABEL = "block text-xs font-medium text-ink-soft";

/**
 * Venue-owner-only composer for the two structured things a host sends in a
 * booking thread: revised terms, or a deposit request.
 *
 * All validation lives in bookingProposals.ts so it's unit-tested without a
 * browser — this component only collects strings and renders errors.
 */
export default function BookingProposalComposer({
  onSend,
  onCancel,
}: {
  onSend: (attachment: BookingProposalAttachment, body: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProposalDraft>(getEmptyProposalDraft("revised_terms"));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isDeposit = draft.kind === "deposit_request";
  const previewTotal = computeEstimatedTotal(
    draft.startTime || null,
    draft.endTime || null,
    draft.hourlyRate ? Number(draft.hourlyRate) : null
  );

  function update(patch: Partial<ProposalDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function switchKind(kind: BookingProposalKind) {
    // Reset rather than carry fields across — a deposit amount left over from
    // the other tab would silently ride along on revised terms.
    setDraft({ ...getEmptyProposalDraft(kind), note: draft.note });
    setErrors({});
  }

  function handleSend() {
    const found = validateProposalDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const attachment = buildProposalAttachment(draft);
    onSend(attachment, summarizeProposal(attachment));
  }

  return (
    <div className="rounded-xl border border-line bg-paper-dim p-4">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-paper p-1">
        {(
          [
            ["revised_terms", "Updated proposal"],
            ["deposit_request", "Deposit request"],
          ] as [BookingProposalKind, string][]
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            aria-pressed={draft.kind === kind}
            onClick={() => switchKind(kind)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              draft.kind === kind ? "bg-wine text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {!isDeposit && (
          <>
            <div>
              <label htmlFor="proposal-start" className={LABEL}>
                New start
              </label>
              <input
                id="proposal-start"
                type="time"
                value={draft.startTime}
                onChange={(event) => update({ startTime: event.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="proposal-end" className={LABEL}>
                New end
              </label>
              <input
                id="proposal-end"
                type="time"
                value={draft.endTime}
                onChange={(event) => update({ endTime: event.target.value })}
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="proposal-rate" className={LABEL}>
                Hourly rate
              </label>
              <input
                id="proposal-rate"
                type="number"
                min={1}
                value={draft.hourlyRate}
                onChange={(event) => update({ hourlyRate: event.target.value })}
                placeholder="$/hr"
                className={FIELD}
              />
            </div>
            <div className="self-end">
              <p className="text-xs text-ink-soft">Estimated total</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {previewTotal !== null ? `$${previewTotal.toLocaleString()}` : "—"}
              </p>
            </div>
          </>
        )}

        {isDeposit && (
          <>
            <div>
              <label htmlFor="proposal-deposit" className={LABEL}>
                Deposit amount
              </label>
              <input
                id="proposal-deposit"
                type="number"
                min={1}
                value={draft.depositAmount}
                onChange={(event) => update({ depositAmount: event.target.value })}
                placeholder="$"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="proposal-due" className={LABEL}>
                Requested by
              </label>
              <input
                id="proposal-due"
                type="date"
                value={draft.dueDate}
                onChange={(event) => update({ dueDate: event.target.value })}
                className={FIELD}
              />
            </div>
          </>
        )}
      </div>

      {Object.values(errors).length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {Object.entries(errors).map(([key, message]) => (
            <li key={key} className="text-xs text-wine">
              {message}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <label htmlFor="proposal-note" className={LABEL}>
          Note
        </label>
        <textarea
          id="proposal-note"
          rows={2}
          value={draft.note}
          onChange={(event) => update({ note: event.target.value })}
          placeholder={
            isDeposit
              ? "A deposit holds the date — the balance is due on the day."
              : "We can do the room an hour later at the same rate."
          }
          className={`resize-none ${FIELD}`}
        />
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">
        {formatProposalFootnote(draft.kind)}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSend}
          className="flex-1 rounded-full bg-wine px-4 py-2 text-xs font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Send to planner
        </button>
      </div>
    </div>
  );
}
