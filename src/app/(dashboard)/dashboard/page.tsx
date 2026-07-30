"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { ROLE_LABELS, type AppRole } from "@/lib/types/roles";

const ROLE_CARDS: { href: string; label: string; description: string; role: AppRole }[] = [
  {
    href: "/dashboard/organizer",
    label: "Organizer",
    description: "Your upcoming bookings across every venue.",
    role: "organizer",
  },
  {
    href: "/dashboard/venue",
    label: "Venue",
    description: "Listings you've submitted, and bookings against them.",
    role: "venue_operator",
  },
  {
    href: "/dashboard/vendor",
    label: "Vendor",
    description: "Your profile, open needs, and active proposals.",
    role: "vendor",
  },
  {
    href: "/dashboard/admin",
    label: "Admin",
    description: "Approval queue and platform activity.",
    role: "admin",
  },
];

export default function DashboardOverviewPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Dashboard"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {user && user.roles.length > 0
          ? `Signed in with the ${user.roles.map((role) => ROLE_LABELS[role]).join(", ")} role${user.roles.length > 1 ? "s" : ""}.`
          : "All four dashboards are shown below — roles you hold are marked."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ROLE_CARDS.map((card) => {
          const held = user?.roles.includes(card.role);
          return (
            <Link
              key={card.href}
              href={card.href}
              className="relative rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-brass"
            >
              {held && (
                <span className="absolute right-4 top-4 rounded-full bg-brass/15 px-2 py-0.5 text-[11px] font-semibold text-brass-dark">
                  Your role
                </span>
              )}
              <h2 className="font-display text-lg font-semibold text-ink">{card.label}</h2>
              <p className="mt-1.5 text-sm text-ink-soft">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
