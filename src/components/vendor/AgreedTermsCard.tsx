import { PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import { summarizeAgreedTerms, formatAgreedTermsFootnote, isTermsLocked, type AgreedTermsLike } from "@/lib/vendors/agreedTerms";
import type { VendorEngagement } from "@/lib/types/vendors";

/** Falls back to the mirrored top-level fields for engagements from before AgreedTerms existed. */
function resolveTerms(engagement: VendorEngagement): AgreedTermsLike {
  if (engagement.terms) return engagement.terms;
  return {
    amount: engagement.agreedAmount,
    pricingModel: engagement.pricingModel,
    deliverables: engagement.agreedDeliverables,
    editedFromProposal: false,
    proposedByOrganizerAt: engagement.createdAt,
    confirmedByVendorAt: engagement.status === "confirmed" || engagement.status === "in_progress" || engagement.status === "completed" ? engagement.updatedAt : null,
    declinedByVendorAt: null,
    declineReason: null,
  };
}

/**
 * The locked-terms record shown once a deal is finalized — the "safety net"
 * for both parties. Wording is a firm mutual commitment, NOT a legal
 * enforceability claim (CLAUDE.md rule #7). TODO(legal): real contract
 * language needs counsel review before any real launch.
 */
export default function AgreedTermsCard({ engagement, counterpartyName }: { engagement: VendorEngagement; counterpartyName: string }) {
  const terms = resolveTerms(engagement);
  const locked = isTermsLocked(terms);

  return (
    <div className={`rounded-xl border p-4 ${locked ? "border-brass/40 bg-brass/5" : "border-line"}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Agreed terms</p>
      <p className="mt-1 text-sm font-semibold text-ink">{summarizeAgreedTerms(terms, PRICING_MODEL_LABELS[terms.pricingModel])}</p>
      {terms.editedFromProposal && <p className="mt-1 text-xs text-ink-soft">Edited from the original proposal by the organizer.</p>}
      <p className="mt-2 text-xs text-ink-soft">{formatAgreedTermsFootnote(terms, counterpartyName)}</p>
    </div>
  );
}
