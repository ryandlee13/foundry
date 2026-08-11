/**
 * Records that a venue owner's paid subscription would activate — deliberately
 * NOT a field on Venue or Account. This is a standalone, deletable-in-one-file
 * scaffold: no payment table, no price, no Stripe. See docs/IMPLEMENTATION_PLAN.md
 * Phase 7 for the real billing work this stands in for. The record survives a
 * venue being removed, since it's keyed by owner, not by venue.
 */
const BILLING_ACTIVATIONS_KEY = "foundry.venues.billingActivations";

export interface VenueBillingActivation {
  ownerId: string;
  /** ISO — when the owner's first venue went live. */
  activatedAt: string;
  /** The venue that triggered activation. Purely informational — removing this venue later does not deactivate. */
  triggeredByVenueId: string;
}

/** Placeholder copy only — the monthly price is genuinely undecided. Never render a dollar figure. */
export const VENUE_SUBSCRIPTION_PLACEHOLDER_COPY =
  "Once your first listing goes live, your venue subscription activates ($X/month, price to be announced). Nothing is charged in this prototype.";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getBillingActivations(): VenueBillingActivation[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BILLING_ACTIVATIONS_KEY);
    return raw ? (JSON.parse(raw) as VenueBillingActivation[]) : [];
  } catch {
    return [];
  }
}

function saveBillingActivations(activations: VenueBillingActivation[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(BILLING_ACTIVATIONS_KEY, JSON.stringify(activations));
}

/** Pure: looks up an owner's activation from an already-loaded list. */
export function selectBillingActivation(
  activations: VenueBillingActivation[],
  ownerId: string
): VenueBillingActivation | undefined {
  return activations.find((activation) => activation.ownerId === ownerId);
}

export function getBillingActivationForOwner(ownerId: string): VenueBillingActivation | undefined {
  return selectBillingActivation(getBillingActivations(), ownerId);
}

/** Idempotent — only the owner's first publish ever records an activation; later ones are no-ops. */
export function recordFirstPublishActivation(ownerId: string, venueId: string): VenueBillingActivation {
  const existing = getBillingActivationForOwner(ownerId);
  if (existing) return existing;

  const activation: VenueBillingActivation = {
    ownerId,
    activatedAt: new Date().toISOString(),
    triggeredByVenueId: venueId,
  };
  saveBillingActivations([...getBillingActivations(), activation]);
  return activation;
}
