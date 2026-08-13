"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Sends people back where they came from. A vendor or venue owner opening
 * one of their own upcoming events from the dashboard was previously dumped
 * into Discover Spaces, which is a browsing surface they weren't browsing.
 * Dashboard links pass ?from=dashboard.
 */
export default function VenueBackLink() {
  const searchParams = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";

  return (
    <Link
      href={fromDashboard ? "/dashboard" : "/spaces"}
      className="text-sm font-medium text-ink-soft hover:text-ink"
    >
      ← {fromDashboard ? "Back to dashboard" : "Back to Discover Spaces"}
    </Link>
  );
}
