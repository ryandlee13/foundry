"use client";

import { useEffect, useState } from "react";
import type { Booking } from "@/lib/types/spaces";

const ROTATING_WORDS = [
  "DJ",
  "Florist",
  "Marketing Influencer",
  "Private Chef",
  "Graphic Designer",
  "Videographer",
  "Photographer",
  "Magician",
  "Photo Booth",
  "Food Sponsor",
];

const ROTATE_INTERVAL_MS = 4000;
const FADE_MS = 250;

function dismissalKey(bookingId: string): string {
  return `foundry.vendors.findVendorsDismissed.${bookingId}`;
}

/**
 * Prompted once per confirmed booking: "Does your event need a ___?" with the
 * blank rotating through common vendor categories. Dismissal is remembered
 * per-booking so it doesn't reprompt every visit — the needs list page keeps
 * a permanent secondary "Find vendors" entry point regardless.
 */
export default function FindVendorsPrompt({ booking, onOpenBuilder }: { booking: Booking; onOpenBuilder: () => void }) {
  const [dismissed, setDismissed] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // localStorage read is client-only and must happen after mount — see AuthProvider.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(window.localStorage.getItem(dismissalKey(booking.id)) === "1");
  }, [booking.id]);

  useEffect(() => {
    if (dismissed) return;
    const interval = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setWordIndex((index) => (index + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [dismissed]);

  function handleDismiss() {
    window.localStorage.setItem(dismissalKey(booking.id), "1");
    setDismissed(true);
  }

  if (booking.status !== "confirmed" || dismissed) return null;

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-paper to-paper-dim p-8 text-center sm:p-10">
      <p className="font-display text-2xl font-semibold text-ink sm:text-3xl">
        Does your event need a
        <br />
        <span
          className={`inline-block border-b-4 border-brass text-wine transition-opacity duration-300 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          {ROTATING_WORDS[wordIndex]}
        </span>
        ?
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenBuilder}
          className="rounded-full bg-wine px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Find Vendors
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-dim"
        >
          Not right now
        </button>
      </div>
    </div>
  );
}
