/**
 * Line-art icons for the marketplace diagram. Single stroke weight, no fill,
 * currentColor throughout, so all three read as one family at a glance —
 * emoji varied too much in weight and color to do that.
 */
const SHARED = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Calendar with a check — an event, planned. */
export function EventPlannersIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <rect x="9" y="15" width="46" height="41" rx="5" />
      <path d="M9 27h46" />
      <path d="M21 15V8M43 15V8" />
      <path d="M24 41l6 6 12-13" />
    </svg>
  );
}

/** Storefront with an awning — a space with its doors open. */
export function VenuesIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <path d="M12 27v27a2 2 0 0 0 2 2h36a2 2 0 0 0 2-2V27" />
      <path d="M8 27l5-16h38l5 16Z" />
      <path d="M23 11v16M41 11v16" />
      <path d="M26 56V42a6 6 0 0 1 12 0v14" />
    </svg>
  );
}

/** A case with a handle — a professional showing up with their kit. */
export function VendorsIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...SHARED} className={className} aria-hidden>
      <rect x="7" y="22" width="50" height="32" rx="4" />
      <path d="M23 22v-6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v6" />
      <path d="M7 36h50" />
      <path d="M27 32h10v8H27z" />
    </svg>
  );
}
