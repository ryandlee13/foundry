"use client";

import { useId, useRef, useState } from "react";
import HeroVenueSearch from "./HeroVenueSearch";
import HeroVendorPanel from "./HeroVendorPanel";

type DiscoveryTab = "venue" | "vendor";

const TABS: { key: DiscoveryTab; label: string }[] = [
  { key: "venue", label: "Find a Venue" },
  { key: "vendor", label: "Find Vendors" },
];

/**
 * The two things a planner can come here to do, as the hero's primary
 * control. Supply-side actions (listing a venue, joining as a vendor) live in
 * the main nav instead — they aren't searches, and putting them next to the
 * search buttons made "what do I click" a four-way question for someone who
 * only wanted to find a room.
 *
 * Venue is the default tab: booking a space is the more common starting
 * point, and the vendor tab exists precisely for planners who've already done
 * that step elsewhere.
 *
 * The venue tab is a search form outright; the vendor tab asks browse-or-post
 * first (HeroVendorPanel), because those two intents don't share a form.
 */
export default function HeroDiscovery() {
  const [tab, setTab] = useState<DiscoveryTab>("venue");
  const baseId = useId();
  const tabRefs = useRef<Record<DiscoveryTab, HTMLButtonElement | null>>({
    venue: null,
    vendor: null,
  });

  const tabId = (key: DiscoveryTab) => `${baseId}-tab-${key}`;
  const panelId = (key: DiscoveryTab) => `${baseId}-panel-${key}`;

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next: DiscoveryTab = tab === "venue" ? "vendor" : "venue";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  /*
   * Translucent rather than solid so the photography reads through it and the
   * card sits *in* the image instead of on top of it as a white box. The blur
   * is what keeps the form legible over a busy frame at 94%.
   *
   * Capped at 408px and centered in its column: at full column width on a
   * large monitor the card outweighed the headline, which is the balance point
   * this hero is built around.
   *
   * The card is sized down through its own chrome — width, padding, and the
   * gaps between controls — never by shrinking the hero section's padding.
   * The photography's height is the composition; the card is the thing that
   * has to fit inside it.
   */
  return (
    <div className="w-full max-w-[408px] rounded-2xl border border-line bg-paper/94 p-4 shadow-[0_18px_50px_-12px_rgba(20,16,14,0.45)] backdrop-blur-[10px] lg:mx-auto">
      <div
        role="tablist"
        aria-label="What are you looking for?"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-2 gap-1 rounded-full bg-paper-dim p-0.5"
      >
        {TABS.map(({ key, label }) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              ref={(node) => {
                tabRefs.current[key] = node;
              }}
              type="button"
              role="tab"
              id={tabId(key)}
              aria-selected={selected}
              aria-controls={panelId(key)}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                selected ? "bg-paper text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/*
        Both panels occupy the same grid cell, so the card is always as tall as
        the taller of the two and switching tabs doesn't resize it. That matters
        well beyond the card: the card is the tallest thing in the hero grid, so
        a shorter vendor panel used to drag the whole hero — photography and all
        — up by ~90px mid-interaction, which read as the page jumping.

        The inactive panel is hidden with `invisible` (visibility: hidden)
        rather than `hidden`. Both keep it off the accessibility tree and out of
        the tab order, but `hidden` also removes it from layout, which is the
        one thing that would defeat the point. Keeping both mounted is a bonus:
        the vendor panel's browse/post choice survives a trip to the other tab.
      */}
      <div className="mt-3 grid">
        {TABS.map(({ key }) => (
          <div
            key={key}
            role="tabpanel"
            id={panelId(key)}
            aria-labelledby={tabId(key)}
            className={`col-start-1 row-start-1 ${tab === key ? "" : "invisible"}`}
          >
            {key === "venue" ? <HeroVenueSearch /> : <HeroVendorPanel />}
          </div>
        ))}
      </div>
    </div>
  );
}
