import { EventPlannersIcon, VendorsIcon, VenuesIcon } from "./MarketplaceIcons";

/**
 * Foundry as the hub: each side of the marketplace connects to the platform
 * in the middle, not directly to each other — that's the actual product
 * shape, and a plain triangle implied the opposite.
 *
 * Styled after a classic three-sided-marketplace diagram: one line-art icon
 * per side, a bold label under it, and a short italic description. All three
 * are treated identically on purpose — an earlier version emphasized Event
 * Planners with its own color and a larger headline, which read as "this is
 * the one that matters."
 */

/** The diagram box's width:height. Node placement below depends on this exact value. */
const ASPECT = 5 / 4;

/**
 * Spoke length as a % of the box's WIDTH. The vertical equivalent has to be
 * scaled by the aspect ratio, or the spokes come out visibly unequal: the
 * SVG uses preserveAspectRatio="none", so one viewBox unit is worth W/100
 * horizontally but H/100 vertically, and H < W here.
 */
const RADIUS_X = 34;
const RADIUS_Y = RADIUS_X * ASPECT;

/**
 * Where each dashed segment starts and ends, as a fraction of the spoke.
 * Fixing both radii is what keeps the visible segments equal: drawn
 * hub-centre to icon-centre, the opaque hub and differently-shaped icons
 * would eat unequal amounts off each end. START clears the hub circle, END
 * stops short of the icons.
 */
const LINE_START = 0.32;
const LINE_END = 0.78;

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
    Icon: EventPlannersIcon,
    description: "One stop shop platform for event creation & communication, no hidden transaction fees",
    // 120° apart, planners at the top.
    angle: 90,
    // The top node's description sits above its icon so it opens away from
    // the hub rather than across it.
    descriptionAbove: true,
  },
  {
    key: "venues",
    label: "Venues",
    Icon: VenuesIcon,
    description: "Rent out unused space seamlessly",
    angle: 210,
    descriptionAbove: false,
  },
  {
    key: "vendors",
    label: "Vendors",
    Icon: VendorsIcon,
    description: "Provide services and build your portfolio at your own rate",
    angle: 330,
    descriptionAbove: false,
  },
].map((node) => ({
  ...node,
  node: pointAt(node.angle, 1),
  lineStart: pointAt(node.angle, LINE_START),
  lineEnd: pointAt(node.angle, LINE_END),
}));

export default function TriangleDiagram() {
  return (
    <>
      {/*
        Narrow screens get a plain stack instead of the diagram — the nodes
        carry an icon plus two lines of text each, which will not lay out
        around a hub at phone widths.
      */}
      <ul className="mx-auto flex max-w-sm flex-col gap-3 px-4 sm:hidden">
        <li className="rounded-2xl border border-brass/40 bg-paper px-5 py-3 text-center font-display text-lg font-semibold text-ink">
          Foundry
        </li>
        {NODES.map(({ key, label, description, Icon }) => (
          <li key={key} className="flex items-center gap-4 rounded-2xl border border-line bg-paper px-5 py-4">
            <Icon className="h-11 w-11 shrink-0 text-wine" />
            <div>
              <p className="font-display text-base font-semibold text-ink">{label}</p>
              <p className="mt-0.5 text-sm italic leading-snug text-ink-soft">{description}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* Padding leaves room for the top node's description to sit above the
          diagram box without being clipped. */}
      <div className="mx-auto hidden w-full max-w-2xl px-4 py-20 sm:block">
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

          {NODES.map(({ key, label, description, Icon, node, descriptionAbove }) => (
            <div
              key={key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {/* The icon is what the spoke points at, so it stays the anchored
                  element; label and description hang off it absolutely and
                  therefore can't shift it. */}
              <div className="relative">
                <Icon className="h-16 w-16 text-wine" />

                <div className="absolute left-1/2 top-full w-56 -translate-x-1/2 pt-2 text-center">
                  <p className="font-display text-lg font-semibold text-ink">{label}</p>
                  {!descriptionAbove && (
                    <p className="mt-1 text-xs italic leading-snug text-ink-soft">{description}</p>
                  )}
                </div>

                {descriptionAbove && (
                  <p className="absolute bottom-full left-1/2 w-64 -translate-x-1/2 pb-2 text-center text-xs italic leading-snug text-ink-soft">
                    {description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
