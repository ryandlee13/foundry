const POINTS = {
  organizer: { x: 50, y: 8 },
  venue: { x: 12, y: 88 },
  vendor: { x: 88, y: 88 },
};

export default function TriangleDiagram() {
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-md px-6 pb-6">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <polygon
          points={`${POINTS.organizer.x},${POINTS.organizer.y} ${POINTS.venue.x},${POINTS.venue.y} ${POINTS.vendor.x},${POINTS.vendor.y}`}
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth="0.7"
          strokeDasharray="2.5 2.5"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={POINTS.organizer.x} cy={POINTS.organizer.y} r="1.8" fill="var(--color-wine)" />
        <circle cx={POINTS.venue.x} cy={POINTS.venue.y} r="1.5" fill="var(--color-brass)" />
        <circle cx={POINTS.vendor.x} cy={POINTS.vendor.y} r="1.5" fill="var(--color-brass)" />
      </svg>

      {/* Event planners — apex */}
      <div className="absolute left-1/2 top-0 w-56 -translate-x-1/2 -translate-y-1 text-center">
        <span className="inline-block rounded-full bg-wine px-3 py-1 text-xs font-semibold text-paper">
          Event Planners
        </span>
        <p className="mt-2 font-display text-lg font-semibold leading-snug text-ink">
          One stop shop platform, no fees
        </p>
      </div>

      {/* Venues — bottom left */}
      <div className="absolute bottom-0 left-0 w-32 text-left">
        <span className="inline-block rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink-soft">
          Venues
        </span>
        <p className="mt-1.5 text-xs leading-snug text-ink-soft">
          Book out unused space
        </p>
      </div>

      {/* Vendors — bottom right */}
      <div className="absolute bottom-0 right-0 w-32 text-right">
        <span className="inline-block rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink-soft">
          Vendors
        </span>
        <p className="mt-1.5 text-xs leading-snug text-ink-soft">
          Provide services seamlessly
        </p>
      </div>
    </div>
  );
}
