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
          // pushed harder, the darker nightlife shots start to crush. No blur
          // and no desaturation: the photography is meant to carry the hero.
          //
          // The desktop focal point is nudged right of center so subjects tend
          // to land in the open right half rather than directly behind the
          // headline. It's one setting across six different compositions, so
          // it's a bias, not a guarantee.
          className={`object-cover object-center saturate-[1.14] contrast-[1.06] transition-opacity duration-1000 lg:object-[58%_center] ${
            photoIndex === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {/*
        A dark scrim, not a light one. The hero copy is warm white now, so
        readability comes from darkening the photo behind it rather than
        washing it toward paper — which is what used to flatten the whole
        left half into near-solid cream.

        Two layers:
        1. A faint universal darken (7%) purely for cohesion, so the right
           side of the frame doesn't read as a separate, brighter image from
           the left.
        2. A localized horizontal gradient that carries the text and is gone
           by roughly two-thirds across.

        Stops below are the gradient's own alpha; layer 1 composites on top,
        so effective darkness is 1-(1-0.07)(1-stop): 0.58 at the left edge,
        0.53 / 0.40 / 0.25 / 0.13, then just the universal 0.07 from 66% out.
        The extra mid stops exist to keep the falloff smooth — with only two
        or three, the transition showed as a visible vertical band down the
        middle of the hero.
      */}
      <div className="absolute inset-0 bg-[rgba(20,16,14,0.07)]" />

      {/* Desktop: copy is in the left column, so the gradient is horizontal. */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(to right, rgba(20,16,14,0.55) 0%, rgba(20,16,14,0.49) 14%, rgba(20,16,14,0.35) 30%, rgba(20,16,14,0.19) 44%, rgba(20,16,14,0.06) 55%, rgba(20,16,14,0) 66%)",
        }}
      />

      {/* Below lg the hero stacks and the copy sits over the photo
          full-width, so the gradient runs vertically and stays heavier —
          there's no empty column to fade into. */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          background:
            "linear-gradient(to bottom, rgba(20,16,14,0.62) 0%, rgba(20,16,14,0.52) 40%, rgba(20,16,14,0.34) 100%)",
        }}
      />
    </div>
  );
}
