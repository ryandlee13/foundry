/**
 * Wipes every piece of data this local-prototype layer has ever written to
 * localStorage: accounts/session, venue listings, bookings, and the entire
 * vendor marketplace (profiles, proposals, engagements, messages,
 * notifications, reviews, etc). Everything this prototype persists is
 * namespaced under "foundry." (see docs in src/lib/auth/storage.ts and
 * src/lib/spaces/submittedVenues.ts), so removing every key with that
 * prefix is a full reset without having to keep a manual key list in sync.
 *
 * This is a dev/demo affordance for the browser-local prototype described
 * in CLAUDE.md's "Local-prototype layer" section — there is no real backend
 * to reset, so "reset" just means "delete this browser's localStorage."
 */
const PROTOTYPE_KEY_PREFIX = "foundry.";

export function clearAllPrototypeData(): void {
  if (typeof window === "undefined") return;

  const keysToRemove = Object.keys(window.localStorage).filter((key) =>
    key.startsWith(PROTOTYPE_KEY_PREFIX)
  );
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}
