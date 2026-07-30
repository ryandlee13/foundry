"use client";

const ABSOLUTE_MIN = 0;
const ABSOLUTE_MAX = 600;
const STEP = 10;

export default function PriceRangeSlider({
  minPrice,
  maxPrice,
  onChange,
}: {
  minPrice: number | null;
  maxPrice: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const currentMin = minPrice ?? ABSOLUTE_MIN;
  const currentMax = maxPrice ?? ABSOLUTE_MAX;
  const minPercent = ((currentMin - ABSOLUTE_MIN) / (ABSOLUTE_MAX - ABSOLUTE_MIN)) * 100;
  const maxPercent = ((currentMax - ABSOLUTE_MIN) / (ABSOLUTE_MAX - ABSOLUTE_MIN)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>${currentMin}/hr</span>
        <span>${currentMax}/hr{currentMax >= ABSOLUTE_MAX ? "+" : ""}</span>
      </div>
      <div className="relative mt-2 h-6">
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-wine"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        <input
          type="range"
          aria-label="Minimum hourly price"
          min={ABSOLUTE_MIN}
          max={ABSOLUTE_MAX}
          step={STEP}
          value={currentMin}
          onChange={(event) => {
            const next = Math.min(Number(event.target.value), currentMax);
            onChange(next === ABSOLUTE_MIN ? null : next, maxPrice);
          }}
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-paper [&::-moz-range-thumb]:bg-wine [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:bg-wine [&::-webkit-slider-thumb]:shadow"
        />
        <input
          type="range"
          aria-label="Maximum hourly price"
          min={ABSOLUTE_MIN}
          max={ABSOLUTE_MAX}
          step={STEP}
          value={currentMax}
          onChange={(event) => {
            const next = Math.max(Number(event.target.value), currentMin);
            onChange(minPrice, next >= ABSOLUTE_MAX ? null : next);
          }}
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-paper [&::-moz-range-thumb]:bg-wine [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-paper [&::-webkit-slider-thumb]:bg-wine [&::-webkit-slider-thumb]:shadow"
        />
      </div>
    </div>
  );
}
