import type { PricingModel } from "@/lib/types/vendors";

/**
 * Structurally matches VendorEngagement.terms (the real AgreedTerms type,
 * added when EngagementStatus grows a vendor-confirmation step) without
 * importing it, so this module has no dependency on that rework and can land
 * independently. A real AgreedTerms value satisfies this shape automatically.
 */
export interface AgreedTermsLike {
  amount: number;
  pricingModel: PricingModel;
  deliverables: string;
  editedFromProposal: boolean;
  proposedByOrganizerAt: string;
  confirmedByVendorAt: string | null;
  declinedByVendorAt: string | null;
  declineReason: string | null;
}

export function isTermsLocked(terms: Pick<AgreedTermsLike, "confirmedByVendorAt">): boolean {
  return terms.confirmedByVendorAt !== null;
}

export function termsDifferFromProposal(terms: Pick<AgreedTermsLike, "editedFromProposal">): boolean {
  return terms.editedFromProposal;
}

/** The locked-record summary line shown on a confirmed engagement / the vendor roster. */
export function summarizeAgreedTerms(
  terms: Pick<AgreedTermsLike, "amount" | "pricingModel" | "deliverables">,
  pricingModelLabel: string
): string {
  const priceLine = `$${terms.amount} ${pricingModelLabel}`;
  return terms.deliverables ? `${priceLine} — ${terms.deliverables}` : priceLine;
}

/**
 * The binding-mutual-commitment footnote. Deliberately does NOT assert
 * court-enforceability — see CLAUDE.md rule #7 and docs/SECURITY.md. Real
 * contract language needs legal counsel before a real launch.
 * TODO(legal): replace with reviewed contract language before any real launch.
 */
export function formatAgreedTermsFootnote(
  terms: Pick<AgreedTermsLike, "confirmedByVendorAt">,
  counterpartyName: string
): string {
  if (!terms.confirmedByVendorAt) {
    return "Awaiting confirmation — these terms are not yet in effect.";
  }
  const date = new Date(terms.confirmedByVendorAt).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `Both parties have confirmed and agreed to these terms on Foundry on ${date}. This is a firm mutual commitment between the organizer and ${counterpartyName}.`;
}
