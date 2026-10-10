"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import HeroVendorSearch from "./HeroVendorSearch";
import IntentDialog, { type IntentOption } from "./IntentDialog";

/**
 * "Find Vendors" is two different jobs wearing one label, and the search form
 * only ever served one of them. Browsing is for a planner who wants to look at
 * who's out there; posting is for a planner who knows what they need and wants
 * proposals to come to them. Dropping everyone straight into a search box sent
 * the second group scrolling a directory instead of writing a brief, so the
 * tab asks which one first.
 *
 * Browsing stays anonymous and stays in the marketing site (/vendors). Posting
 * needs an account — a gig belongs to somebody — so it routes through the same
 * IntentDialog account question the header's supply-side actions use.
 */

type VendorMode = "choose" | "browse";

/** Where the posting flow lands, once the planner says whether they have a venue. */
type PostingAnchor = "existing_booking" | "vendor_first";

/**
 * `?post=1` opens the request form on arrival rather than leaving the planner
 * on a dashboard page to find the button they already pressed once.
 */
const POSTING_DESTINATIONS: Record<PostingAnchor, string> = {
  existing_booking: "/dashboard/organizer/vendors?post=1",
  vendor_first: "/dashboard/organizer/vendors/unassigned?post=1",
};

/**
 * `justify-center` matters once these stretch: the two options divide whatever
 * height the venue form sets, so the text has to sit in the middle of the box
 * rather than clinging to the top of a tall empty rectangle.
 */
const OPTION_CLASS =
  "group flex w-full flex-col justify-center rounded-xl border border-line bg-paper px-4 py-3 text-left transition-colors hover:border-brass hover:bg-paper-dim";

/**
 * These boxes stretch to fill the card, so they can end up a good deal taller
 * than their two lines of text need. The arrow gives a tall box something to
 * terminate on and reads as "this goes somewhere" rather than as slack.
 */
function Chevron() {
  return (
    <span className="mt-2 flex items-center gap-1 text-xs font-semibold text-brass-dark">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export default function HeroVendorPanel() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<VendorMode>("choose");
  /** Set when the planner has answered the venue question but still needs an account. */
  const [pendingAnchor, setPendingAnchor] = useState<PostingAnchor | null>(null);
  const [anchorDialogOpen, setAnchorDialogOpen] = useState(false);

  /*
   * The venue question is asked BEFORE the account question on purpose. Sign-in
   * navigates away and comes back via `next`, so an answer collected after it
   * would have nowhere to live in between — asking first means the answer is
   * already baked into the URL the planner returns to.
   */
  function chooseAnchor(anchor: PostingAnchor) {
    setAnchorDialogOpen(false);
    if (!isLoading && user) {
      router.push(POSTING_DESTINATIONS[anchor]);
      return;
    }
    setPendingAnchor(anchor);
  }

  const anchorOptions: IntentOption[] = [
    {
      key: "existing_booking",
      label: "I've already booked a venue",
      description: "Post the request on that event so vendors see the date, time, and neighborhood.",
      onSelect: () => chooseAnchor("existing_booking"),
      emphasis: true,
    },
    {
      key: "vendor_first",
      label: "Vendor first — I'll add the venue later",
      description:
        "They wait in your vendor lobby. Move them to a venue whenever you book one and everyone lands in one conversation.",
      onSelect: () => chooseAnchor("vendor_first"),
    },
  ];

  const accountOptions: IntentOption[] = pendingAnchor
    ? [
        {
          key: "sign-in",
          label: "I already have an account",
          description: "Sign in and we'll take you straight to the form.",
          href: `/sign-in?next=${encodeURIComponent(POSTING_DESTINATIONS[pendingAnchor])}`,
          emphasis: true,
        },
        {
          key: "sign-up",
          label: "Create a profile",
          description: "Takes a minute — one account covers every role.",
          href: `/sign-up?role=organizer&next=${encodeURIComponent(POSTING_DESTINATIONS[pendingAnchor])}`,
        },
      ]
    : [];

  return (
    <div className="h-full">
      {mode === "browse" ? (
        <>
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="mb-2.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            ← Browse or post
          </button>
          <HeroVendorSearch />
        </>
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-sm text-ink-soft">How would you like to find vendors?</p>

          {/*
            `flex-1` + `auto-rows-fr`: the two options divide all the height the
            card has, so this tab has no dead space under it even though the
            venue form is the taller panel setting that height.

            auto-rows-fr also keeps the pair equal to each other, which is the
            point independent of filling — the descriptions wrap to different
            line counts, and neither option is the recommended one, so a taller
            box would quietly argue for itself.
          */}
          <div className="mt-2.5 grid flex-1 auto-rows-fr gap-2.5">
            <button type="button" onClick={() => setMode("browse")} className={OPTION_CLASS}>
              <span className="block text-sm font-semibold text-ink">Browse vendors</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Search by category, date, and budget, then reach out to the ones you like.
              </span>
              <Chevron />
            </button>

            <button type="button" onClick={() => setAnchorDialogOpen(true)} className={OPTION_CLASS}>
              <span className="block text-sm font-semibold text-ink">Create a posting</span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Describe what you need once and let vendors send you proposals.
              </span>
              <Chevron />
            </button>
          </div>
        </div>
      )}

      <IntentDialog
        open={anchorDialogOpen}
        onClose={() => setAnchorDialogOpen(false)}
        title="Do you have a venue yet?"
        description="Either is fine — it just decides where the request lives."
        options={anchorOptions}
      />

      <IntentDialog
        open={pendingAnchor !== null}
        onClose={() => setPendingAnchor(null)}
        title="Do you already have a Foundry account?"
        description="You'll need one to post a request — it's where the proposals come back to."
        options={accountOptions}
      />
    </div>
  );
}
