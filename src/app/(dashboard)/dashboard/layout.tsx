"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useOwnedVenuesData } from "@/hooks/useOwnedVenuesData";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import LoadingState from "@/components/ui/LoadingState";

const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/organizer", label: "Organizer" },
  { href: "/dashboard/venue", label: "Venue" },
  { href: "/dashboard/vendor", label: "Vendor" },
  { href: "/dashboard/messages", label: "Messages" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/admin", label: "Admin" },
];

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading } = useAuth();
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
      <aside className="lg:w-56 lg:shrink-0">
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {DASHBOARD_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
            >
              {item.label}
              {item.href === "/dashboard/venue" && pendingCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[10px] font-bold text-paper">
                  {pendingCount}
                </span>
              )}
              {item.href === "/dashboard/messages" && unreadMessages > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[10px] font-bold text-paper">
                  {unreadMessages}
                </span>
              )}
              {item.href === "/dashboard/notifications" && unreadNotifications > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-wine text-[10px] font-bold text-paper">
                  {unreadNotifications}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
