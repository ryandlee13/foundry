import Link from "next/link";

// NOTE: This layout does not yet perform a server-side session check.
// Phase 2 in docs/IMPLEMENTATION_PLAN.md adds `supabase.auth.getUser()` here
// (and a role check on each sub-route) before this route group is reachable
// with unauthenticated or unauthorized requests. See docs/SECURITY.md #2–3.

const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/organizer", label: "Organizer" },
  { href: "/dashboard/venue", label: "Venue" },
  { href: "/dashboard/vendor", label: "Vendor" },
  { href: "/dashboard/admin", label: "Admin" },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {DASHBOARD_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
