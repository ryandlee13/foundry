import { notFound } from "next/navigation";
import SeedVenueOwnerButton from "@/components/spaces/SeedVenueOwnerButton";
import { SEED_VENUE_OWNER_EMAIL } from "@/lib/spaces/seedVenueOwner";

export default function SeedVenuesDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Seed a venue owner demo account</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Development only. Creates the account <span className="font-semibold text-ink">{SEED_VENUE_OWNER_EMAIL}</span> and gives it
        ownership of 7 of the seed Discover Spaces listings, so the venue-owner dashboard, editing, and booking
        flows can be tested against real owned listings. There&apos;s no password to set — this prototype signs in
        by email only, so sign in at <span className="font-semibold text-ink">/sign-in</span> with that address.
        Never runs automatically and never runs in production.
      </p>
      <div className="mt-6">
        <SeedVenueOwnerButton />
      </div>
    </div>
  );
}
