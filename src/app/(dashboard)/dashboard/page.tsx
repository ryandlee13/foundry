import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Foundry",
};

const ROLE_CARDS = [
  {
    href: "/dashboard/organizer",
    label: "Organizer",
    description: "Event briefs, booking requests, and vendor proposals.",
  },
  {
    href: "/dashboard/venue",
    label: "Venue",
    description: "Listings, incoming booking requests, and quotes.",
  },
  {
    href: "/dashboard/vendor",
    label: "Vendor",
    description: "Your profile, open needs, and active proposals.",
  },
  {
    href: "/dashboard/admin",
    label: "Admin",
    description: "Approval queue and platform activity.",
  },
];

export default function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        This account&apos;s roles will determine which of these you see once
        sign-in is connected. All four are shown here as placeholders.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ROLE_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-brass"
          >
            <h2 className="font-display text-lg font-semibold text-ink">
              {card.label}
            </h2>
            <p className="mt-1.5 text-sm text-ink-soft">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
