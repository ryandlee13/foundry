"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import IntentDialog, { type IntentOption } from "./IntentDialog";

type OpenDialog = "none" | "vendorIntent" | "venueAccount" | "vendorAccount";

const OR = (
  <span className="text-sm font-medium uppercase tracking-wide text-ink-soft" aria-hidden>
    or
  </span>
);

/**
 * The three ways into Foundry, branched by intent rather than by dumping
 * every destination into the hero. Browsing needs no account; listing does,
 * so those two ask about sign-in first — and "Vendors" is ambiguous (hiring
 * one vs. becoming one), so it asks which before it asks anything else.
 */
export default function HeroActions() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [dialog, setDialog] = useState<OpenDialog>("none");

  const signedIn = !isLoading && Boolean(user);

  function handleListYourVenue() {
    if (signedIn) {
      router.push("/list-your-venue");
      return;
    }
    setDialog("venueAccount");
  }

  function handleListYourService() {
    if (signedIn) {
      router.push("/dashboard/vendor/onboarding");
      return;
    }
    setDialog("vendorAccount");
  }

  const accountOptions = (nextPath: string, role: string): IntentOption[] => [
    {
      key: "sign-in",
      label: "I already have an account",
      description: "Sign in and pick up where you left off.",
      href: `/sign-in?next=${encodeURIComponent(nextPath)}`,
      emphasis: true,
    },
    {
      key: "sign-up",
      label: "Create a profile",
      description: "Takes a minute — one account covers every role.",
      href: `/sign-up?role=${role}&next=${encodeURIComponent(nextPath)}`,
    },
  ];

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Link
          href="/spaces"
          className="rounded-full bg-wine px-6 py-3 text-center text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Browse Spaces
        </Link>

        {OR}

        <button
          type="button"
          onClick={handleListYourVenue}
          className="rounded-full border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          List Your Venue
        </button>

        {OR}

        <button
          type="button"
          onClick={() => setDialog("vendorIntent")}
          className="rounded-full border border-line bg-paper px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Vendors
        </button>
      </div>

      <IntentDialog
        open={dialog === "vendorIntent"}
        onClose={() => setDialog("none")}
        title="What brings you here?"
        options={[
          {
            key: "find",
            label: "Find vendors",
            description: "Browse DJs, photographers, caterers and more.",
            href: "/vendors",
            emphasis: true,
          },
          {
            key: "list",
            label: "List your service",
            description: "Get discovered and bid on open gigs.",
            onSelect: handleListYourService,
          },
        ]}
      />

      <IntentDialog
        open={dialog === "venueAccount"}
        onClose={() => setDialog("none")}
        title="Do you already have a Foundry account?"
        description="You'll need one to list a space."
        options={accountOptions("/list-your-venue", "venue_operator")}
      />

      <IntentDialog
        open={dialog === "vendorAccount"}
        onClose={() => setDialog("none")}
        title="Do you already have a Foundry account?"
        description="You'll need one to list your service."
        options={accountOptions("/dashboard/vendor/onboarding", "vendor")}
      />
    </>
  );
}
