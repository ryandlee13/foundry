import Link from "next/link";
import { getSkillName } from "@/lib/vendors/skills";
import { formatExpiration } from "@/lib/vendors/expiration";
import type { EventNeedWithMatch } from "@/lib/types/vendors";

function formatBudget(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Contact for quote";
  if (min !== null && max !== null) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

export interface GigBadges {
  isNew: boolean;
  isUrgent: boolean;
}

/** Pure: takes `now` explicitly rather than calling Date.now() itself, so callers compute it once outside render. */
export function computeGigBadges(need: Pick<EventNeedWithMatch, "publishedAt" | "createdAt" | "proposalDeadline">, now: number): GigBadges {
  const publishedAt = new Date(need.publishedAt ?? need.createdAt).getTime();
  const deadline = new Date(need.proposalDeadline).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  return {
    isNew: now - publishedAt < threeDaysMs,
    isUrgent: deadline - now < threeDaysMs && deadline > now,
  };
}

export default function GigCard({
  need,
  saved,
  badges,
  now,
  onToggleSave,
}: {
  need: EventNeedWithMatch;
  saved: boolean;
  badges: GigBadges;
  now: string;
  onToggleSave: () => void;
}) {
  const { isNew, isUrgent } = badges;
  const fewBids = need.bidCount < 3;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-line bg-paper p-5 transition-all hover:-translate-y-0.5 hover:border-brass hover:shadow-lg">
      <div className="flex flex-wrap items-center gap-1.5">
        {isNew && <span className="rounded-full bg-brass/15 px-2.5 py-1 text-[11px] font-semibold text-brass-dark">New</span>}
        {need.locationType === "remote" && (
          <span className="rounded-full bg-paper-dim px-2.5 py-1 text-[11px] font-semibold text-ink-soft">Remote</span>
        )}
        {isUrgent && <span className="rounded-full bg-wine/10 px-2.5 py-1 text-[11px] font-semibold text-wine">Urgent</span>}
        {fewBids && <span className="rounded-full bg-paper-dim px-2.5 py-1 text-[11px] font-semibold text-ink-soft">Few bids</span>}
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-semibold text-ink">{need.title}</h3>
          <p className="text-xs text-ink-soft">
            {getSkillName(need.skillSlug)} · {need.locationType === "remote" ? "Remote" : need.publicLocation}
          </p>
        </div>
        <button
          type="button"
          aria-label={saved ? "Unsave opportunity" : "Save opportunity"}
          aria-pressed={saved}
          onClick={(e) => {
            e.preventDefault();
            onToggleSave();
          }}
          className="shrink-0 rounded-full p-1.5 text-ink-soft hover:bg-paper-dim hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.75}>
            <path d="M12 20.5s-7.5-4.7-9.8-9.4C.8 7.7 2.5 4.5 5.8 4c2-.3 3.8.6 4.9 2.2.9-1.6 2.9-2.5 4.9-2.2 3.3.5 5 3.7 3.6 7.1-2.3 4.7-9.8 9.4-9.8 9.4Z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <p className="mt-2 text-sm text-ink-soft">
        {need.eventDate} · {need.startTime}–{need.endTime}
      </p>
      {need.deliverables && <p className="mt-1 line-clamp-1 text-xs text-ink-soft">{need.deliverables}</p>}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-ink-soft">
        <span className="font-semibold text-ink">{formatBudget(need.budgetMin, need.budgetMax)}</span>
        <span>
          {need.bidCount} bid{need.bidCount === 1 ? "" : "s"} · {need.positionsAvailable - need.positionsFilled} open ·{" "}
          {formatExpiration(need.proposalDeadline, now)}
        </span>
      </div>

      {need.matchReason && <p className="mt-2 text-xs italic text-brass-dark">{need.matchReason}</p>}

      <Link href={`/dashboard/vendor/gigs/${need.id}`} className="absolute inset-0" aria-label={`Place a bid on ${need.title}`} />
    </article>
  );
}
