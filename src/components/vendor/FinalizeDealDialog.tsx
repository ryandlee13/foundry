"use client";

import { useState } from "react";
import Dialog from "@/components/ui/Dialog";
import { PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import type { PricingModel, VendorProposal } from "@/lib/types/vendors";

export interface FinalizeDealTerms {
  amount: number;
  pricingModel: PricingModel;
  deliverables: string;
}

/**
 * The organizer's finalize step: commit to the terms currently on the table,
 * or change them one more time. Either way the vendor must then separately
 * confirm via confirmEngagementTerms() — this dialog only sends the offer,
 * it does not finalize anything by itself.
 *
 * `currentTerms` is the *effective* deal, not the vendor's original bid: once
 * the two sides have accepted a round in the proposal log, that's what
 * finalizing should lock in. Showing the original bid here after a negotiation
 * would quietly discard everything they agreed to.
 */
export default function FinalizeDealDialog({
  open,
  proposal,
  currentTerms,
  negotiated,
  counterpartyName,
  onClose,
  onFinalize,
}: {
  open: boolean;
  proposal: VendorProposal | null;
  currentTerms: FinalizeDealTerms;
  /** True when an accepted round in the log has superseded the original bid. */
  negotiated: boolean;
  counterpartyName: string;
  onClose: () => void;
  onFinalize: (terms?: FinalizeDealTerms) => void;
}) {
  const [mode, setMode] = useState<"asProposed" | "editTerms">("asProposed");
  const [amount, setAmount] = useState("");
  const [pricingModel, setPricingModel] = useState<PricingModel>("flat_fee");
  const [deliverables, setDeliverables] = useState("");

  function openEditTerms() {
    setAmount(String(currentTerms.amount));
    setPricingModel(currentTerms.pricingModel);
    setDeliverables(currentTerms.deliverables);
    setMode("editTerms");
  }

  function handleSubmit() {
    if (mode === "editTerms") {
      onFinalize({ amount: Number(amount) || 0, pricingModel, deliverables });
    } else {
      // Omitting terms keeps the proposal verbatim, which is only correct when
      // nothing was negotiated. After an accepted round, pass the agreed terms
      // explicitly or finalizing silently reverts to the original bid.
      onFinalize(negotiated ? currentTerms : undefined);
    }
    setMode("asProposed");
  }

  if (!proposal) return null;

  return (
    <Dialog
      open={open}
      onClose={() => {
        setMode("asProposed");
        onClose();
      }}
      labelledBy="finalize-deal-dialog-title"
      panelClassName="w-full max-w-md p-6"
    >
      <h2 id="finalize-deal-dialog-title" className="font-display text-xl font-semibold text-ink">
        Send final terms to {counterpartyName}?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        This sends the terms to {counterpartyName} for confirmation — it isn&apos;t final until they accept. You&apos;ll
        see &quot;Awaiting vendor confirmation&quot; until then.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("asProposed")}
          className={`flex-1 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
            mode === "asProposed" ? "border-wine bg-wine text-paper" : "border-line text-ink-soft hover:bg-paper-dim"
          }`}
        >
          {negotiated ? "Finalize as agreed" : "Finalize as proposed"}
        </button>
        <button
          type="button"
          onClick={openEditTerms}
          className={`flex-1 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
            mode === "editTerms" ? "border-wine bg-wine text-paper" : "border-line text-ink-soft hover:bg-paper-dim"
          }`}
        >
          Edit deal terms
        </button>
      </div>

      {mode === "asProposed" ? (
        <div className="mt-4 rounded-lg bg-paper-dim px-3.5 py-3 text-sm">
          <p className="font-semibold text-ink">
            ${currentTerms.amount} {PRICING_MODEL_LABELS[currentTerms.pricingModel]}
          </p>
          {currentTerms.deliverables && <p className="mt-1 text-ink-soft">{currentTerms.deliverables}</p>}
          {negotiated && (
            <p className="mt-2 text-xs text-brass-dark">
              These are the terms you both accepted in the proposal log, not the original bid of $
              {proposal.proposedAmount}.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-soft">Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-soft">Pricing model</label>
              <select
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value as PricingModel)}
                className="mt-1 w-full rounded-lg border border-line bg-paper px-2.5 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              >
                {Object.entries(PRICING_MODEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-soft">Deliverables</label>
            <textarea
              rows={2}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Send final terms
        </button>
      </div>
    </Dialog>
  );
}
