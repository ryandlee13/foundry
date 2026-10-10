import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import { INTERACTIVE_ROW } from "@/lib/ui/interactive";
import type { UpNextItem } from "@/lib/events/upNext";

/**
 * "What do I have to do" at the top of a dashboard.
 *
 * Each row links straight to where the action happens rather than to the page
 * that lists the thing — the point is to remove the two clicks between
 * noticing and doing.
 */
export default function UpNextStrip({ items }: { items: UpNextItem[] }) {
  if (items.length === 0) {
    /*
     * Still rendered when empty. "You're all caught up" is information — it's
     * the difference between nothing being due and the strip having failed to
     * load — and a section that vanishes teaches people not to look for it.
     */
    return (
      <section className="rounded-2xl border border-line bg-paper px-5 py-4">
        <h2 className="font-display text-base font-semibold text-ink">Up next</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          You&apos;re all caught up — nothing is waiting on you right now.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brass/40 bg-brass/5">
      <div className="px-5 pb-1 pt-4">
        <h2 className="font-display text-base font-semibold text-ink">
          Up next
          <span className="ml-2 text-sm font-normal text-ink-soft">
            {items.length} waiting on you
          </span>
        </h2>
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${INTERACTIVE_ROW}`}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs text-ink-soft">{item.context}</span>
              </span>
              <StatusBadge className="shrink-0" descriptor={item.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
