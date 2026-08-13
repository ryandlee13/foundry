/**
 * Foundry as the hub: each side of the marketplace connects to the platform
 * in the middle, not directly to each other — that's the actual product
 * shape, and the old triangle implied the opposite.
 *
 * All three sides are styled identically on purpose. An earlier version
 * emphasized Event Planners with its own color and a much larger headline,
 * which read as "this is the one that matters."
 *
 * Descriptions are hover/focus-only so the diagram stays legible; that's why
 * the pills are large enough to carry the layout on their own.
 */

/** The diagram box's width:height. Node placement below depends on this exact value. */
const ASPECT = 5 / 4;

/**
 * Spoke length as a % of the box's WIDTH. The vertical equivalent has to be
 * scaled by the aspect ratio, or the spokes come out visibly unequal: the
 * SVG uses preserveAspectRatio="none", so one viewBox unit is worth W/100
 * horizontally but H/100 vertically, and H < W here.
 */
const RADIUS_X = 36;
const RADIUS_Y = RADIUS_X * ASPECT;

/**
 * Where each dashed segment starts and ends, as a fraction of the spoke.
 *
 * Drawing hub-center to pill-center would make the segments look unequal
 * even though they aren't: the opaque hub and pills cover the ends, and a
 * pill approached diagonally hides roughly twice as much of the line as the
 * top pill approached straight-on. Fixing both radii makes every visible
 * segment identical by construction. START clears the hub circle; END stops
 * short of the pills.
 */
const LINE_START = 0.3;
const LINE_END = 0.75;

/** Polar -> percentage coordinates, measured from the hub at the box's center. */
function pointAt(angleDegrees: number, fraction: number): { x: number; y: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: 50 + RADIUS_X * fraction * Math.cos(radians),
    // Negated because SVG/CSS y grows downward.
    y: 50 - RADIUS_Y * fraction * Math.sin(radians),
  };
}

const NODES = [
  {
    key: "planners",
    label: "Event Planners",
    icon: "🎉",
    description: "One stop shop platform for event creation & communication, no hidden transaction fees",
    // 120° apart, planners at the top.
    angle: 90,
    // Descriptions open away from the hub so they never cover it.
    place: "above" as const,
    /**
     * Optical correction, not geometry. The spoke meets this pill head-on and
     * so is hidden only by half its height, while the two diagonal spokes
     * pass under a corner and lose about twice as much. Left at 1 the top
     * line reads as floating well clear of its pill while the others nearly
     * touch theirs; pulling the pill in closes that gap. The dashed segments
     * are unaffected — their endpoints are fixed radii above.
     */
    radius: 0.9,
  },
  {
    key: "venues",
    label: "Venues",
    icon: "🏛️",
    description: "Rent out unused space seamlessly",
    angle: 210,
    place: "below" as const,
    radius: 1,
  },
  {
    key: "vendors",
    label: "Vendors",
    icon: "🎨",
    description: "Provide services and build your portfolio at your own rate",
    angle: 330,
    place: "below" as const,
    radius: 1,
  },
].map((node) => ({
  ...node,
  node: pointAt(node.angle, node.radius),
  lineStart: pointAt(node.angle, LINE_START),
  lineEnd: pointAt(node.angle, LINE_END),
}));

export default function TriangleDiagram() {
  return (
    <>
      {/*
        Narrow screens get a plain stack instead of the hub diagram. The
        pills are a fixed pixel width, so below ~600px they crowd the layout
        badly enough that the spokes would start inside the hub circle.
        Descriptions are always visible here — there's no hover to reveal
        them on a touch screen.
      */}
      <ul className="mx-auto flex max-w-sm flex-col gap-3 px-4 sm:hidden">
        <li className="rounded-2xl border border-brass/40 bg-paper px-5 py-3 text-center font-display text-lg font-semibold text-ink">
          Foundry
        </li>
        {NODES.map((node) => (
          <li key={node.key} className="rounded-2xl border border-line bg-paper px-5 py-4">
            <p className="flex items-center gap-2.5 text-base font-semibold text-ink">
              <span className="text-xl" aria-hidden>
                {node.icon}
              </span>
              {node.label}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-ink-soft">{node.description}</p>
          </li>
        ))}
      </ul>

      {/* Vertical padding leaves room for the hover descriptions to open
          outward past the diagram box without being clipped. */}
      <div className="mx-auto hidden w-full max-w-2xl px-4 py-16 sm:block">
        <div className="relative aspect-[5/4] w-full">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            {NODES.map((node) => (
              <line
                key={node.key}
                x1={node.lineStart.x}
                y1={node.lineStart.y}
                x2={node.lineEnd.x}
                y2={node.lineEnd.y}
                stroke="var(--color-brass)"
                strokeWidth="0.6"
                strokeDasharray="2.5 2.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-brass/40 bg-paper shadow-sm">
              <span className="font-display text-xl font-semibold tracking-tight text-ink">Foundry</span>
            </div>
          </div>

          {NODES.map((node) => (
            <div
              key={node.key}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.node.x}%`, top: `${node.node.y}%` }}
            >
              {/* Fixed width across all three so no one side reads as the important one. */}
              <button
                type="button"
                className="flex w-60 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-line bg-paper px-5 py-3.5 text-lg font-semibold text-ink shadow-sm transition-colors hover:border-brass focus:border-brass focus:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                aria-describedby={`node-desc-${node.key}`}
              >
                <span className="text-2xl" aria-hidden>
                  {node.icon}
                </span>
                {node.label}
              </button>

              <p
                id={`node-desc-${node.key}`}
                className={`pointer-events-none absolute left-1/2 w-64 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-center text-xs font-medium leading-snug text-paper opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 ${
                  node.place === "above" ? "bottom-full mb-2" : "top-full mt-2"
                }`}
              >
                {node.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
