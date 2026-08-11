/**
 * Scales radiusMiles into a [6, 46] visual size, normalized against
 * maxRadiusMiles so the full option range stays visually distinguishable —
 * without a max, values above ~25mi all saturate near the same size since
 * sqrt(radius) flattens out. Default max (25) preserves the exact prior
 * behavior for the venue-search caller.
 */
function radiusToVisualSize(radiusMiles: number, maxRadiusMiles: number): number {
  const ratio = maxRadiusMiles > 0 ? Math.min(1, radiusMiles / maxRadiusMiles) : 0;
  return 6 + Math.sqrt(ratio) * 40;
}

/**
 * Stand-in for a live map when no NEXT_PUBLIC_MAPBOX_TOKEN is configured —
 * an abstract "city block" backdrop with a pin and a radius circle that
 * scales with the selected radius. This is explicitly a radius diagram, not
 * a real map — it never receives or plots coordinates. See
 * src/lib/spaces/locations.ts for the real location data driving venue
 * search; this component is presentation-only. Caption text should say
 * "radius" language, never "map", so it isn't mistaken for a real one.
 */
export default function MapPreview({
  radiusMiles,
  maxRadiusMiles = 25,
  caption = "Radius preview",
}: {
  radiusMiles: number;
  /** The largest value the caller's radius options go up to, for visual scale normalization. */
  maxRadiusMiles?: number;
  caption?: string;
}) {
  const visualRadius = radiusToVisualSize(radiusMiles, maxRadiusMiles);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line"
      style={{
        backgroundColor: "var(--color-paper-dim)",
        backgroundImage:
          "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
        backgroundSize: "12.5% 16.6%",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <circle
          cx="50"
          cy="50"
          r={visualRadius}
          fill="color-mix(in srgb, var(--color-wine) 12%, transparent)"
          stroke="var(--color-wine)"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />
        <circle cx="50" cy="50" r="2.2" fill="var(--color-wine)" stroke="var(--color-paper)" strokeWidth="0.8" />
      </svg>

      <span className="absolute bottom-2 right-2 rounded-full border border-line bg-paper/90 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
        {caption}
      </span>
    </div>
  );
}
