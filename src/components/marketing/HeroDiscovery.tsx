"use client";

import { useId, useRef, useState } from "react";
import HeroVenueSearch from "./HeroVenueSearch";
import HeroVendorSearch from "./HeroVendorSearch";

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

  return (
    <div className="w-full rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
      <div
        role="tablist"
        aria-label="What are you looking for?"
        onKeyDown={handleKeyDown}
        className="grid grid-cols-2 gap-1 rounded-full bg-paper-dim p-1"
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
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                selected ? "bg-paper text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId(tab)}
        aria-labelledby={tabId(tab)}
        className="mt-5"
      >
        {tab === "venue" ? <HeroVenueSearch /> : <HeroVendorSearch />}
      </div>
    </div>
  );
}
