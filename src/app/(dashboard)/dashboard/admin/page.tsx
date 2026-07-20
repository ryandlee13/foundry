import type { Metadata } from "next";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Admin dashboard — Foundry",
};

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Admin dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pending venue and vendor approvals, document review, and the audit
        log will appear here.
      </p>

      <div className="mt-8">
        <EmptyState
          title="Nothing pending review"
          description="Submitted venue listings and vendor profiles will show up here for approval."
        />
      </div>
    </div>
  );
}
