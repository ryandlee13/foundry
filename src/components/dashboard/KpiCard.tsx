import Link from "next/link";
import type { ReactNode } from "react";
import { INTERACTIVE_CARD } from "@/lib/ui/interactive";

/**
 * A single headline number. Pass `href` to make the whole card a drill-down
 * (e.g. "Events thrown" -> the event history); pass `footnote` for the
 * caveat a number needs to be honest (estimates, excluded rows).
 */
export default function KpiCard({
  label,
  value,
  footnote,
  href,
}: {
  label: string;
  value: ReactNode;
  footnote?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold text-ink">{value}</p>
      {footnote && <p className="mt-1 text-xs leading-snug text-ink-soft">{footnote}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`group flex flex-col rounded-2xl border border-line bg-paper p-5 ${INTERACTIVE_CARD}`}>
        {body}
        {/*
          Always rendered, not revealed on hover.
          
          This was `opacity-0 group-hover:opacity-100`, which meant that on any
          touch device — where there is no hover — the only clue that a KPI
          drilled down into anything never appeared at all. Now it's quiet at
          rest and brightens on hover, so the affordance exists for everyone and
          still doesn't compete with the number.
        */}
        <span className="mt-auto pt-3 text-xs font-semibold text-ink-soft transition-colors group-hover:text-brass-dark">
          View all →
        </span>
      </Link>
    );
  }

  return <div className="rounded-2xl border border-line bg-paper p-5">{body}</div>;
}
