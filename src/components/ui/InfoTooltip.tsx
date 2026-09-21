"use client";

import { useId, useState } from "react";

/**
 * Small "i" affordance with a text bubble.
 *
 * Opens on hover *and* on focus, and the trigger is a real button, so it's
 * reachable by keyboard — a hover-only tooltip on a non-focusable element is
 * invisible to anyone not using a mouse. Escape closes it. The bubble is
 * wired up with aria-describedby rather than a title attribute so screen
 * readers announce it with the control it belongs to.
 */
export default function InfoTooltip({
  label,
  children,
}: {
  /** Accessible name for the trigger, e.g. "About amenities". */
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const bubbleId = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? bubbleId : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-ink-soft/50 text-[10px] font-semibold text-ink-soft transition-colors hover:border-brass hover:text-brass-dark focus:outline-none focus:ring-1 focus:ring-brass"
      >
        i
      </button>

      {open && (
        <span
          id={bubbleId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-normal leading-relaxed text-ink shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
