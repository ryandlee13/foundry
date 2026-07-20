function radiusToVisualSize(radiusMiles: number): number {
  return Math.min(46, 6 + Math.sqrt(radiusMiles) * 8);
}

/**
 * Stand-in for a live map when no NEXT_PUBLIC_MAPBOX_TOKEN is configured —
 * an abstract "city block" backdrop with a pin and a radius circle that
 * scales with the selected radius. See src/lib/spaces/locations.ts for the
 * real location data driving search; this component is presentation-only.
 */
export default function MapPreview({ radiusMiles }: { radiusMiles: number }) {
  const visualRadius = radiusToVisualSize(radiusMiles);

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
        Radius preview
      </span>
    </div>
  );
}
