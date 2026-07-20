"use client";

import { useEffect, useState } from "react";

// Dummy filler content, explicitly approved as a temporary exception to the
// "no fake reviews" rule in CLAUDE.md — invented names/quotes/avatars, not
// real testimonials. Replace with real recaps before launch; avatars are
// initials (not photos) so no real person's likeness is attached to a quote
// they never gave. See CLAUDE.md for the scope of this exception.
const RECAPS = [
  {
    persona: "Event Planners",
    name: "Maria Chen",
    role: "Event Planner",
    quote:
      "I planned our company holiday party in a weekend instead of a month of email chains — one dashboard for the venue, the DJ, and the caterer.",
    initials: "MC",
  },
  {
    persona: "Venue Owners",
    name: "James Whitfield",
    role: "Venue Owner, The Ironworks",
    quote:
      "Our loft used to sit empty on weeknights. Now it's booked for supper clubs and community meetups we never would have found on our own.",
    initials: "JW",
  },
  {
    persona: "Vendors",
    name: "Alex Rivera",
    role: "DJ & Vendor",
    quote:
      "I picked up three new gigs in my first month and finally have a place to show off past work instead of just a phone full of photos.",
    initials: "AR",
  },
];

export default function RecapCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % RECAPS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const current = RECAPS[index];

  return (
    <div>
      <div
        className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-3xl p-8 text-paper sm:p-12"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-ink) 92%, var(--color-wine)), color-mix(in srgb, var(--color-wine) 70%, black))",
        }}
      >
        <div className="flex justify-end">
          <span className="font-display text-lg font-semibold sm:text-xl">
            Hear from {current.persona}
          </span>
        </div>

        <div className="mt-10 max-w-xl">
          <p className="font-display text-xl leading-snug sm:text-2xl">
            &ldquo;{current.quote}&rdquo;
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper/15 text-sm font-semibold">
              {current.initials}
            </span>
            <div>
              <p className="text-sm font-semibold">{current.name}</p>
              <p className="text-xs text-paper/70">{current.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {RECAPS.map((recap, i) => (
          <button
            key={recap.name}
            type="button"
            aria-label={`Show ${recap.persona} recap`}
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
