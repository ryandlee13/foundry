import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Vendor dashboard — Foundry",
};

export default function VendorDashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Vendor dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your profile status, open needs matching your category, and active
        proposals will appear here.
      </p>

      <div className="mt-8">
        <EmptyState
          title="No vendor profile yet"
          description="Create a vendor profile to start browsing open event needs. Profiles are reviewed before they go public."
        />
      </div>
    </div>
  );
}
