import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Organizer dashboard — Foundry",
};

export default function OrganizerDashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Organizer dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your event briefs, venue booking requests, and vendor proposals will
        appear here.
      </p>

      <div className="mt-8">
        <EmptyState
          title="No events yet"
          description="Create an event brief to start browsing venues and requesting bookings."
        />
      </div>
    </div>
  );
}
