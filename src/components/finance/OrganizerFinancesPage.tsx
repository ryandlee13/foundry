"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { formatEventDate } from "@/lib/spaces/bookings";
import { formatMoney } from "@/lib/ui/format";
import { organizerEventPath } from "@/lib/vendors/organizerRoutes";
import { INTERACTIVE_ROW } from "@/lib/ui/interactive";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import LedgerTable from "./LedgerTable";
import {
  resolveOrganizerLedgers,
  resolveUnassignedVendorLines,
  type OrganizerEventLedger,
} from "@/lib/finance/eventLedgerData";
import {
  formatLedgerSummary,
  LEDGER_FOOTNOTE,
  summarizeLedger,
  type EventLedger,
} from "@/lib/finance/eventLedger";

/**
 * Every event's money in one place, expandable to line items.
 *
 * The planner-level view: each event collapsed to its three totals, because
 * "what is this costing me across everything" was previously unanswerable
 * without opening each event and adding up by hand.
 */
export default function OrganizerFinancesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<OrganizerEventLedger[]>([]);
  const [unassigned, setUnassigned] = useState<EventLedger | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEvents(resolveOrganizerLedgers(user.id));
    const loose = resolveUnassignedVendorLines(user.id);
    setUnassigned(loose.length > 0 ? summarizeLedger(loose) : null);
    setLoaded(true);
  }, [user]);

  if (authLoading || !loaded) return <LoadingState label="Loading your finances…" />;
  if (!user) return null;

  /*
   * Committed money only. Summing the estimates across events would produce
   * the single most misleading number this page could show — a figure nobody
   * has agreed to, presented as a grand total.
   */
  const committedAcrossEvents = events.reduce((total, event) => total + event.ledger.firmTotal, 0);
  const estimatedAcrossEvents = events.reduce((total, event) => total + event.ledger.estimatedTotal, 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Finances</h1>
      <p className="mt-1 text-sm text-ink-soft">
        What each event is costing you, split between what&apos;s agreed and what&apos;s still an estimate.
      </p>

      {events.length === 0 && !unassigned ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing to total up yet"
            description="Once a venue confirms a booking or a vendor agrees terms, the figures show up here."
            action={
              <Link
                href="/spaces"
                className="rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Discover spaces
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Committed across all events</p>
              <p className="mt-1.5 font-display text-2xl font-semibold text-ink">
                {formatMoney(committedAcrossEvents)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">Figures you and your suppliers have agreed.</p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Estimated on top</p>
              <p className="mt-1.5 font-display text-2xl font-semibold text-ink">
                ~{formatMoney(estimatedAcrossEvents)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Our arithmetic from rates and booked hours — not agreed figures.
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-3">
            {events.map((event) => {
              const expanded = expandedId === event.bookingId;
              const panelId = `ledger-${event.bookingId}`;
              return (
                <li key={event.bookingId} className="rounded-2xl border border-line bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : event.bookingId)}
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      className={`-my-1 min-w-0 flex-1 rounded-lg px-1 py-1 text-left ${INTERACTIVE_ROW}`}
                    >
                      <span className="block font-display text-base font-semibold text-ink">
                        {event.eventLabel}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {formatEventDate(event.eventDate)} · {formatLedgerSummary(event.ledger, formatMoney)}
                      </span>
                    </button>
                    <Link
                      href={organizerEventPath(event.bookingId)}
                      className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper-dim"
                    >
                      Open event
                    </Link>
                  </div>

                  {expanded && (
                    <div id={panelId} className="mt-4 border-t border-line pt-4">
                      <LedgerTable ledger={event.ledger} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/*
            Vendors hired before there was a venue. Separate on purpose: these
            have no booking window, so none of them can be estimated, and
            folding them into an event's total would attribute them to an event
            they aren't on.
          */}
          {unassigned && (
            <section className="mt-8">
              <h2 className="font-display text-lg font-semibold text-ink">Not assigned to an event yet</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Hired with no venue attached. No booked hours means a rate can&apos;t be turned into a total, so
                these sit outside every event&apos;s figures.
              </p>
              <div className="mt-4 rounded-2xl border border-line bg-paper p-5">
                <LedgerTable ledger={unassigned} />
              </div>
            </section>
          )}

          <p className="mt-6 text-xs leading-relaxed text-ink-soft">{LEDGER_FOOTNOTE}</p>
        </>
      )}
    </div>
  );
}
