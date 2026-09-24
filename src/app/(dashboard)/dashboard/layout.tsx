"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useOwnedVenuesData } from "@/hooks/useOwnedVenuesData";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import LoadingState from "@/components/ui/LoadingState";
import type { AppRole } from "@/lib/types/roles";

/**
 * "Event Status" is the active role's own workspace — the page that used to
 * be linked as "Organizer"/"Venue"/"Vendor". Only the active role's one is
 * shown; switching roles happens from the pill on the dashboard, not by
 * having all three in the sidebar at once.
 */
const EVENT_DETAILS_HREF: Record<AppRole, string | null> = {
  organizer: "/dashboard/organizer",
  venue_operator: "/dashboard/venue",
  vendor: "/dashboard/vendor",
  admin: null,
};

function matches(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Most specific match wins. The organizer's Vendors tab lives *under* Event
 * Details (`/dashboard/organizer/vendors` vs `/dashboard/organizer`), so a
 * plain prefix test lights up both at once and neither one tells you where you
 * are. Returns the winning href, or null on a page no tab owns.
 */
function resolveActiveHref(pathname: string, hrefs: string[]): string | null {
  return hrefs
    .filter((href) => matches(pathname, href))
    .reduce<string | null>((best, href) => (best === null || href.length > best.length ? href : best), null);
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading } = useAuth();
  const { activeRole } = useActiveRole();
  const router = useRouter();
  const pathname = usePathname();
  const { pendingCount } = useOwnedVenuesData(user?.id);
  const { unreadMessages, unreadNotifications } = useUnreadCounts(user?.id);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <LoadingState label="Checking your account…" />
      </div>
    );
  }

  const eventDetailsHref = activeRole ? EVENT_DETAILS_HREF[activeRole] : null;
  const navItems: { href: string; label: string; badge?: number }[] = [
    { href: "/dashboard", label: "Dashboard" },
    ...(eventDetailsHref
      ? [
          {
            href: eventDetailsHref,
            label: "Event Status",
            badge: activeRole === "venue_operator" ? pendingCount : undefined,
          },
        ]
      : []),
    /*
     * Hiring vendors is half of planning an event, so it gets a tab of its own
     * rather than a button on one row of the bookings list. Planner-side only:
     * a venue operator or a vendor has no vendors to hire from here.
     */
    ...(activeRole === "organizer" ? [{ href: "/dashboard/organizer/vendors", label: "Vendors" }] : []),
    { href: "/dashboard/messages", label: "Messages", badge: unreadMessages },
    { href: "/dashboard/notifications", label: "Notifications", badge: unreadNotifications },
    { href: "/dashboard/admin", label: "Admin" },
  ];

  const activeHref = resolveActiveHref(
    pathname,
    navItems.map((item) => item.href)
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {navItems.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-paper-dim text-ink" : "text-ink-soft hover:bg-paper-dim hover:text-ink"
                }`}
              >
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-wine px-1 text-[10px] font-bold text-paper">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
