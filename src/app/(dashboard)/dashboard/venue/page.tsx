import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Venue dashboard — Foundry",
};

export default function VenueDashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Venue dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your listings, incoming booking requests, and quotes will appear
        here.
      </p>

      <div className="mt-8">
        <EmptyState
          title="No venue listings yet"
          description="Submit a venue to start receiving booking requests. Listings are reviewed before they go public."
        />
      </div>
    </div>
  );
}
