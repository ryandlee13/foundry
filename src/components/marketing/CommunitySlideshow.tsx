"use client";

import { useEffect, useState } from "react";

// Illustrative categories, not claims of events actually hosted yet —
// this showcases the kind of recurring/community gatherings Foundry is
// built to support.
const COMMUNITY_EVENTS = [
  {
    label: "Mahjong Club",
    blurb: "Weekly tile nights that need a cozy, recurring space.",
    icon: "🀄",
  },
  {
    label: "Chess Club",
    blurb: "Casual matches and open boards for local players.",
    icon: "♟️",
  },
  {
    label: "Run Club",
    blurb: "Group meetups that need a starting point and a place to gather after.",
    icon: "🏃",
  },
  {
    label: "Pop-Up Food",
    blurb: "Chef collaborations and one-night tasting menus.",
    icon: "🍜",
  },
];

export default function CommunitySlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % COMMUNITY_EVENTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const current = COMMUNITY_EVENTS[index];

  return (
    <div className="rounded-2xl border border-line bg-paper p-2">
      <div
        className="relative flex h-72 flex-col justify-end overflow-hidden rounded-xl p-6 text-paper sm:h-80"
        style={{
          background:
            "linear-gradient(160deg, color-mix(in srgb, var(--color-wine) 80%, black), color-mix(in srgb, var(--color-brass) 55%, var(--color-wine)))",
        }}
      >
        <span className="text-4xl" aria-hidden>
          {current.icon}
        </span>
        <h3 className="mt-3 font-display text-2xl font-semibold">
          {current.label}
        </h3>
        <p className="mt-1 max-w-xs text-sm text-paper/80">{current.blurb}</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 py-3">
        {COMMUNITY_EVENTS.map((event, i) => (
          <button
            key={event.label}
            type="button"
            aria-label={`Show ${event.label}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-wine" : "w-1.5 bg-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
