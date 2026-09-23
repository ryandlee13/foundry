"use client";

import { useState } from "react";
import { PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import {
  NEGOTIABLE_PRICING_MODELS,
  buildDealProposal,
  formatDealProposalFootnote,
  getEmptyDealProposalDraft,
  summarizeDealProposal,
  validateDealProposalDraft,
  type DealProposalDraft,
} from "@/lib/vendors/dealProposals";
import type { DealProposalAttachment, PricingModel } from "@/lib/types/vendors";

const FIELD =
  "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";
const LABEL = "block text-xs font-medium text-ink-soft";

/**
 * Composer for a round of vendor deal terms. Used by BOTH sides — a planner
 * countering a vendor and a vendor countering back run the same form, which is
 * the change Teddy asked for: the planner is no longer limited to one
 * take-it-or-leave-it edit at finalize time.
 *
 * Pre-filled from whatever is currently on the table, so a counter starts from
 * the live numbers instead of a blank form. All validation lives in
 * dealProposals.ts so it's unit-tested without a browser.
 */
export default function DealProposalComposer({
  senderRole,
  currentTerms,
  onSend,
  onCancel,
}: {
  senderRole: DealProposalAttachment["senderRole"];
  currentTerms: { amount: number; pricingModel: PricingModel; deliverables: string };
  onSend: (attachment: DealProposalAttachment, body: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DealProposalDraft>(() => getEmptyDealProposalDraft(currentTerms));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(patch: Partial<DealProposalDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function handleSend() {
    const found = validateDealProposalDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const attachment = buildDealProposal(draft, senderRole);
    onSend(attachment, summarizeDealProposal(attachment));
  }

  return (
    <div className="rounded-xl border border-line bg-paper-dim p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Propose terms</p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="deal-amount" className={LABEL}>
            Amount
          </label>
          <input
            id="deal-amount"
            type="number"
            min={1}
            value={draft.amount}
            onChange={(event) => update({ amount: event.target.value })}
            placeholder="$"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="deal-pricing" className={LABEL}>
            Pricing
          </label>
          <select
            id="deal-pricing"
            value={draft.pricingModel}
            onChange={(event) => update({ pricingModel: event.target.value as PricingModel })}
            className={FIELD}
          >
            {NEGOTIABLE_PRICING_MODELS.map((model) => (
              <option key={model} value={model}>
                {PRICING_MODEL_LABELS[model]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="deal-deliverables" className={LABEL}>
          What&apos;s included at this price
        </label>
        <textarea
          id="deal-deliverables"
          rows={2}
          value={draft.deliverables}
          onChange={(event) => update({ deliverables: event.target.value })}
          placeholder="4-hour set, own controller and speakers, 1 hour setup"
          className={`resize-none ${FIELD}`}
        />
      </div>

      <div className="mt-3">
        <label htmlFor="deal-note" className={LABEL}>
          Note
        </label>
        <textarea
          id="deal-note"
          rows={2}
          value={draft.note}
          onChange={(event) => update({ note: event.target.value })}
          placeholder="Happy to do this if we can start load-in at 4."
          className={`resize-none ${FIELD}`}
        />
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

      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">{formatDealProposalFootnote()}</p>

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
          Send terms
        </button>
      </div>
    </div>
  );
}
