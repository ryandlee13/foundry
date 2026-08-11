/**
 * Dev-only seeder for a real venue-owner account, mirroring
 * src/lib/vendors/seed.ts's pattern. Triggered manually from /dev/seed-venues
 * (which 404s in production) — never runs automatically.
 *
 * The account email is hardcoded to a real address (josephwharton@gmail.com)
 * at explicit user instruction, understanding it ships in the public JS bundle
 * and is committed to source control. There is no password anywhere in this
 * prototype — src/lib/auth/storage.ts never persists or checks one, so signing
 * in as this account is just typing the email at /sign-in.
 */
import * as authStorage from "@/lib/auth/storage";
import { VENUES } from "./venues";
import { adoptSeedVenues } from "./submittedVenues";
import { recordFirstPublishActivation, getBillingActivationForOwner } from "./venueBilling";

export const SEED_VENUE_OWNER_EMAIL = "josephwharton@gmail.com";
export const SEED_VENUE_OWNER_NAME = "Joseph Wharton";

/** 7 of the 17 seed venues, spanning a mix of neighborhoods and space types. */
const SEED_ADOPTED_VENUE_IDS = [
  "v-neon-foundry",
  "v-harbor-room",
  "v-concrete-garden",
  "v-skyline-atrium",
  "v-redline-loft",
  "v-glasshouse-social",
  "v-sanctuary-hall",
];

export interface SeedVenueOwnerResult {
  ownerEmail: string;
  venuesAdopted: number;
}

/** Idempotent by email — re-running reuses the existing account and skips venues already adopted. */
export function seedVenueOwnerDemoData(): SeedVenueOwnerResult {
  const existingAccount = authStorage.findAccountByEmail(SEED_VENUE_OWNER_EMAIL);
  const account =
    existingAccount ?? authStorage.createAccount({ name: SEED_VENUE_OWNER_NAME, email: SEED_VENUE_OWNER_EMAIL, role: "venue_operator" });
  authStorage.addRoleToAccount(account.id, "venue_operator");

  const seedCreatedAt = VENUES[0]?.createdAt ?? new Date().toISOString();
  const adopted = adoptSeedVenues(account.id, SEED_ADOPTED_VENUE_IDS, seedCreatedAt);

  if (!getBillingActivationForOwner(account.id)) {
    const firstVenueId = adopted[0]?.id ?? SEED_ADOPTED_VENUE_IDS[0];
    recordFirstPublishActivation(account.id, firstVenueId);
  }

  return { ownerEmail: SEED_VENUE_OWNER_EMAIL, venuesAdopted: adopted.length };
}
