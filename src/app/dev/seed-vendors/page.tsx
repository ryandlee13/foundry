import { notFound } from "next/navigation";
import SeedDemoDataButton from "@/components/vendor/SeedDemoDataButton";

export default function SeedVendorsDevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-semibold text-ink">Seed vendor marketplace demo data</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Development only. Populates this browser&apos;s localStorage with 12 fictional vendor profiles, 8 published
        event opportunities, and a mix of submitted, accepted, declined, and expired proposals so the full vendor
        experience can be tested. Never runs automatically and never runs in production.
      </p>
      <div className="mt-6">
        <SeedDemoDataButton />
      </div>
    </div>
  );
}
