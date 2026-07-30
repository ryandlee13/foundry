"use client";

import { RADIUS_OPTIONS_MILES } from "@/lib/types/spaces";

export default function RadiusSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (radius: number) => void;
}) {
  const currentIndex = RADIUS_OPTIONS_MILES.indexOf(
    value as (typeof RADIUS_OPTIONS_MILES)[number]
  );
  const index = currentIndex === -1 ? 0 : currentIndex;

  function step(delta: number) {
    const nextIndex = Math.min(
      RADIUS_OPTIONS_MILES.length - 1,
      Math.max(0, index + delta)
    );
    onChange(RADIUS_OPTIONS_MILES[nextIndex]);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">Search radius</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Decrease radius"
            disabled={index === 0}
            onClick={() => step(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-paper-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-semibold text-ink" aria-live="polite">
            {value} {value === 1 ? "mile" : "miles"}
          </span>
          <button
            type="button"
            aria-label="Increase radius"
            disabled={index === RADIUS_OPTIONS_MILES.length - 1}
            onClick={() => step(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink transition-colors hover:bg-paper-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Radius presets">
        {RADIUS_OPTIONS_MILES.map((radius) => (
          <button
            key={radius}
            type="button"
            aria-pressed={radius === value}
            onClick={() => onChange(radius)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              radius === value
                ? "border-wine bg-wine text-paper"
                : "border-line bg-paper text-ink-soft hover:border-brass hover:text-ink"
            }`}
          >
            {radius} mi
          </button>
        ))}
      </div>
    </div>
  );
}
