"use client";

import { useState } from "react";
import {
  buildContract,
  formatContractFootnote,
  getEmptyContractDraft,
  summarizeContract,
  validateContractDraft,
  type ContractDraft,
} from "@/lib/spaces/bookingContracts";
import type { BookingContractAttachment } from "@/lib/types/vendors";

const FIELD =
  "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";
const LABEL = "block text-xs font-medium text-ink-soft";

/**
 * Venue-operator-only. Drafts the formal agreement, pre-filled from whatever
 * terms the thread has already settled, and signs it as it sends — an unsigned
 * contract isn't a contract, so there's deliberately no "save draft" path.
 *
 * All validation lives in bookingContracts.ts so it's unit-tested without a
 * browser. This component only collects strings and renders errors.
 */
export default function ContractComposer({
  seed,
  onSend,
  onCancel,
}: {
  seed: { title: string; scope: string; totalAmount: number | null; depositAmount: number | null };
  onSend: (contract: BookingContractAttachment, body: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ContractDraft>(() => getEmptyContractDraft(seed));
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(patch: Partial<ContractDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function handleSend() {
    const found = validateContractDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const contract = buildContract(draft, new Date().toISOString());
    onSend(contract, `Sent an agreement: ${summarizeContract(contract)}`);
  }

  return (
    <div className="rounded-xl border border-line bg-paper-dim p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Send an agreement</p>

      <div className="mt-3">
        <label htmlFor="contract-title" className={LABEL}>
          Title
        </label>
        <input
          id="contract-title"
          type="text"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          placeholder="Venue rental agreement"
          className={FIELD}
        />
      </div>

      <div className="mt-3">
        <label htmlFor="contract-scope" className={LABEL}>
          What you&apos;re providing
        </label>
        <textarea
          id="contract-scope"
          rows={3}
          value={draft.scope}
          onChange={(event) => update({ scope: event.target.value })}
          placeholder="Exclusive use of the main room and bar from 6pm to midnight, including two staff and one hour of setup."
          className={`resize-none ${FIELD}`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="contract-total" className={LABEL}>
            Total (optional)
          </label>
          <input
            id="contract-total"
            type="number"
            min={1}
            value={draft.totalAmount}
            onChange={(event) => update({ totalAmount: event.target.value })}
            placeholder="$"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="contract-deposit" className={LABEL}>
            Deposit (optional)
          </label>
          <input
            id="contract-deposit"
            type="number"
            min={1}
            value={draft.depositAmount}
            onChange={(event) => update({ depositAmount: event.target.value })}
            placeholder="$"
            className={FIELD}
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="contract-due" className={LABEL}>
          Balance due (optional)
        </label>
        <input
          id="contract-due"
          type="date"
          value={draft.balanceDueDate}
          onChange={(event) => update({ balanceDueDate: event.target.value })}
          className={FIELD}
        />
      </div>

      <div className="mt-3">
        <label htmlFor="contract-cancellation" className={LABEL}>
          Cancellation policy
        </label>
        <textarea
          id="contract-cancellation"
          rows={2}
          value={draft.cancellationPolicy}
          onChange={(event) => update({ cancellationPolicy: event.target.value })}
          placeholder="Full refund up to 30 days before the event; the deposit is non-refundable after that."
          className={`resize-none ${FIELD}`}
        />
      </div>

      <div className="mt-3">
        <label htmlFor="contract-additional" className={LABEL}>
          Additional terms (optional)
        </label>
        <textarea
          id="contract-additional"
          rows={2}
          value={draft.additionalTerms}
          onChange={(event) => update({ additionalTerms: event.target.value })}
          placeholder="Certificate of insurance required 7 days before the event. No open flame."
          className={`resize-none ${FIELD}`}
        />
      </div>

      <div className="mt-3">
        <label htmlFor="contract-host-signature" className={LABEL}>
          Sign as
        </label>
        <input
          id="contract-host-signature"
          type="text"
          value={draft.hostSignature}
          onChange={(event) => update({ hostSignature: event.target.value })}
          placeholder="Your full name"
          className={FIELD}
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

      <p className="mt-2 text-[11px] leading-relaxed text-ink-soft">{formatContractFootnote()}</p>

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
          Sign &amp; send
        </button>
      </div>
    </div>
  );
}
