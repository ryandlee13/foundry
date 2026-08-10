import { getSkillName } from "@/lib/vendors/skills";
import { formatDeadlineDate } from "@/lib/vendors/expiration";
import type { EventNeed } from "@/lib/types/vendors";

function formatBudget(need: Pick<EventNeed, "budgetMin" | "budgetMax">): string {
  if (need.budgetMin && need.budgetMax) return `$${need.budgetMin}–$${need.budgetMax}`;
  if (need.budgetMin) return `$${need.budgetMin}+`;
  if (need.budgetMax) return `Up to $${need.budgetMax}`;
  return "Not specified";
}

/** Read-only pre-publish summary card for one drafted vendor need. */
export default function VendorNeedReviewSummary({
  need,
  eventLabel,
  onEdit,
}: {
  need: EventNeed;
  eventLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Looking for</p>
          <p className="font-display text-lg font-semibold text-ink">{need.title || getSkillName(need.skillSlug)}</p>
        </div>
        <button type="button" onClick={onEdit} className="shrink-0 text-xs font-semibold text-wine hover:underline">
          Edit
        </button>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Event</dt>
          <dd className="text-right font-medium text-ink">{eventLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Date</dt>
          <dd className="text-right font-medium text-ink">{need.eventDate}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Time needed</dt>
          <dd className="text-right font-medium text-ink">
            {need.startTime}–{need.endTime}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Location</dt>
          <dd className="text-right font-medium text-ink">
            {need.locationType === "remote" ? "Remote" : need.publicLocation}
          </dd>
        </div>
        {need.estimatedAttendance != null && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Guests</dt>
            <dd className="text-right font-medium text-ink">{need.estimatedAttendance}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Budget</dt>
          <dd className="text-right font-medium text-ink">{formatBudget(need)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Proposals due</dt>
          <dd className="text-right font-medium text-ink">{formatDeadlineDate(need.proposalDeadline)}</dd>
        </div>
      </dl>

      {need.description && (
        <div className="mt-4 rounded-lg bg-paper-dim px-3.5 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Description</p>
          <p className="mt-1 text-sm text-ink">{need.description}</p>
        </div>
      )}
    </div>
  );
}
