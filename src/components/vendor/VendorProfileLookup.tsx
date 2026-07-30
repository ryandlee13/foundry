"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import VendorDetailView from "./VendorDetailView";
import { getVendorProfileBySlug } from "@/lib/vendors/profiles";
import type { VendorProfile } from "@/lib/types/vendors";

/**
 * Vendor profiles only exist in localStorage (no server in this prototype —
 * see CLAUDE.md), so they can't be resolved at build time. Looked up
 * client-side after mount, same pattern as SubmittedVenueLookup.tsx.
 * Only ever renders a `published` profile — draft/pending/rejected/suspended
 * profiles are never publicly reachable, per docs/SECURITY.md #9.
 */
export default function VendorProfileLookup({ slug }: { slug: string }) {
  const [status, setStatus] = useState<"loading" | "found" | "not-found">("loading");
  const [vendor, setVendor] = useState<VendorProfile | null>(null);

  useEffect(() => {
    const match = getVendorProfileBySlug(slug);
    if (match && match.status === "published") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVendor(match);
      setStatus("found");
    } else {
      setStatus("not-found");
    }
  }, [slug]);

  if (status === "loading") {
    return <LoadingState label="Loading vendor…" />;
  }

  if (status === "not-found" || !vendor) {
    return (
      <EmptyState
        title="This vendor profile isn't here"
        description="It may not be published yet, may have been submitted in a different browser, or the link is out of date."
        action={
          <Link
            href="/vendors"
            className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
          >
            Back to vendors
          </Link>
        }
      />
    );
  }

  return <VendorDetailView vendor={vendor} />;
}
