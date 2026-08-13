"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActiveRole } from "@/hooks/useActiveRole";
import RolePill from "@/components/dashboard/RolePill";
import OrganizerDashboard from "@/components/dashboard/OrganizerDashboard";
import VenueDashboard from "@/components/dashboard/VenueDashboard";
import VendorDashboard from "@/components/dashboard/VendorDashboard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeRole, resolved, switchRole, addAndSwitchRole } = useActiveRole();

  if (!user || !resolved) {
    return <LoadingState label="Loading your dashboard…" />;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Welcome back, {user.name.split(" ")[0]}
      </h1>
      <div className="mt-1.5">
        {activeRole ? (
          <RolePill
            activeRole={activeRole}
            heldRoles={user.roles}
            onSwitch={switchRole}
            onAddRole={addAndSwitchRole}
          />
        ) : (
          <p className="text-sm text-ink-soft">Your account doesn&apos;t have a role yet.</p>
        )}
      </div>

      <div className="mt-8">
        {activeRole === "organizer" && <OrganizerDashboard accountId={user.id} />}
        {activeRole === "venue_operator" && <VenueDashboard accountId={user.id} />}
        {activeRole === "vendor" && <VendorDashboard accountId={user.id} />}
        {activeRole === "admin" && (
          <EmptyState
            title="Admin account"
            description="This account only holds the admin role. Moderation tools live in the Admin section."
            action={
              <Link
                href="/dashboard/admin"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Go to Admin
              </Link>
            }
          />
        )}
        {activeRole === null && (
          <EmptyState
            title="Pick how you'll use Foundry"
            description="Add a role to get started — you can hold more than one and switch between them at any time."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => addAndSwitchRole("organizer")}
                  className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
                >
                  Plan events
                </button>
                <button
                  type="button"
                  onClick={() => addAndSwitchRole("venue_operator")}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
                >
                  List a space
                </button>
                <button
                  type="button"
                  onClick={() => addAndSwitchRole("vendor")}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
                >
                  Offer a service
                </button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
