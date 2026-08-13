"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * One venue photo at a time behind the hero headline, crossfading.
 *
 * These are real photographs, so they are deliberately uncaptioned and
 * unattributed: they show the kind of gathering Foundry is built for, and
 * must never be labelled as events booked or hosted through the platform.
 * Same rule the rest of the marketing copy follows — no claiming activity
 * that hasn't happened yet (see CLAUDE.md).
 */
const PHOTOS = [
  { src: "/venues/mahjong-hall.jpg", alt: "A packed hall of mahjong tables under a disco ball" },
  { src: "/venues/live-music-room.jpg", alt: "A live band playing to a crowd in a draped, plant-filled room" },
  { src: "/venues/skyline-lounge.jpg", alt: "An evening reception in a lounge overlooking a city skyline" },
  { src: "/venues/warehouse-courts.jpg", alt: "A daytime social event in a warehouse with courts and ping-pong tables" },
  { src: "/venues/garden-courtyard.jpg", alt: "Guests talking in a candlelit courtyard full of hanging plants" },
  { src: "/venues/wine-room.jpg", alt: "A candlelit dining room lined with floor-to-ceiling wine racks" },
];

const ROTATE_MS = 6000;

export default function HeroBackdrop() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Respect a reduced-motion preference by not auto-advancing at all —
    // the first photo simply stays put.
    const prefersReducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const timer = setInterval(() => setIndex((current) => (current + 1) % PHOTOS.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {PHOTOS.map((photo, photoIndex) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt=""
          fill
          // Only the first is eager — the rest load as the rotation reaches them.
          priority={photoIndex === 0}
          sizes="100vw"
          // Modest saturation/contrast lift so the photos keep some punch
          // through the scrim instead of reading flat. Kept small on purpose —
          // pushed harder, the darker nightlife shots start to crush.
          className={`object-cover saturate-[1.14] contrast-[1.06] transition-opacity duration-1000 ${
            photoIndex === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/*
        Two-part scrim rather than one heavy wash, so the photos stay visible.

        1. A light overall tint that ties the photos to the paper palette
           without hiding them.
        2. A gradient that is strong only where the headline sits and falls
           away to nothing across the rest of the frame. The hero text is
           dark ink, and several of these photos are dark nightlife shots —
           without a local wash behind the copy it would be unreadable.
      */}
      <div className="absolute inset-0 bg-paper/10" />

      {/* Desktop: text is in the left column, so the wash is horizontal and
          clears by ~72%, which is roughly where the headline ends. */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(to right, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 88%, transparent) 28%, color-mix(in srgb, var(--color-paper) 52%, transparent) 52%, color-mix(in srgb, var(--color-paper) 8%, transparent) 72%, transparent 100%)",
        }}
      />

      {/* Below lg the hero stacks, so the copy sits over the photo full-width. */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-paper) 0%, color-mix(in srgb, var(--color-paper) 88%, transparent) 45%, color-mix(in srgb, var(--color-paper) 60%, transparent) 100%)",
        }}
      />
    </div>
  );
}
