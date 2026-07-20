"use client";

export default function LocationSearch({
  locationLabel,
  radiusMiles,
  onOpen,
}: {
  locationLabel: string;
  radiusMiles: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-full border border-line bg-paper px-5 py-3.5 text-left shadow-sm transition-colors hover:border-brass sm:w-auto"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-wine" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" strokeLinejoin="round" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink">{locationLabel}</span>
        <span className="block text-xs text-ink-soft">
          Within {radiusMiles} {radiusMiles === 1 ? "mile" : "miles"}
        </span>
      </span>
      <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
