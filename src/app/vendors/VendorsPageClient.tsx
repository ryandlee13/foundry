"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPublishedVendorProfiles } from "@/lib/vendors/profiles";
import { getSkillName } from "@/lib/vendors/skills";
import {
  briefToSearchParams,
  filterVendorsByBrief,
  getEmptyBrief,
  hasBriefContext,
  searchParamsToBrief,
  type VendorSearchBrief,
} from "@/lib/vendors/vendorSearch";
import { formatEventDate } from "@/lib/spaces/bookings";
import VendorCategorySelect from "@/components/vendor/VendorCategorySelect";
import VendorProfileCard from "@/components/vendor/VendorProfileCard";
import EmptyState from "@/components/ui/EmptyState";
import type { VendorProfile, VendorSkillSlug } from "@/lib/types/vendors";

const FIELD_CLASS =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass";
/** Inputs match VendorCategorySelect's fixed height so the brief row lines up. */
const INPUT_CLASS = `${FIELD_CLASS} h-11 py-0`;
const LABEL_CLASS = "block text-xs font-semibold uppercase tracking-wide text-ink-soft";

function toPositiveInt(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

/** Chips summarizing what the planner told us on the way in. */
function BriefChips({ brief }: { brief: VendorSearchBrief }) {
  const chips: string[] = [];
  if (brief.skillSlug) chips.push(getSkillName(brief.skillSlug));
  if (brief.eventDate) chips.push(formatEventDate(brief.eventDate));
  if (brief.guestCount !== null) chips.push(`${brief.guestCount} guests`);
  if (brief.budget !== null) chips.push(`$${brief.budget.toLocaleString()} budget`);

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-brass/40 bg-paper px-3 py-1 text-xs font-medium text-ink"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

export default function VendorsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [todayIso, setTodayIso] = useState<string | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [editingBrief, setEditingBrief] = useState(false);

  const brief = useMemo(
    () => searchParamsToBrief(new URLSearchParams(searchParams.toString())),
    [searchParams]
  );

  useEffect(() => {
    // Published vendor profiles only exist in localStorage — see profiles.ts.
    // Today's date is resolved here too rather than during render, so the
    // server and client markup can't disagree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVendors(getPublishedVendorProfiles());
    setTodayIso(new Date().toISOString().slice(0, 10));
  }, []);

  /** Writes a brief back to the URL so the search stays shareable and back works. */
  function applyBrief(next: VendorSearchBrief) {
    const params = briefToSearchParams(next);
    const query = params.toString();
    router.push(query ? `/vendors?${query}` : "/vendors");
  }

  const results = useMemo(() => {
    // Until the date resolves, skip the lead-time rule rather than guess —
    // it's the only brief filter that needs "now".
    const briefMatched = todayIso
      ? filterVendorsByBrief(vendors, brief, todayIso)
      : filterVendorsByBrief(vendors, { ...brief, eventDate: null }, todayIso ?? "");

    return briefMatched.filter((vendor) => {
      if (remoteOnly && !vendor.location.remoteAvailable) return false;
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const haystack =
          `${vendor.displayName} ${vendor.location.homeCity} ${vendor.professionalDescription}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [vendors, brief, todayIso, remoteOnly, search]);

  const briefActive = hasBriefContext(brief);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Find vendors and creative talent
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Already have your space? Search DJs, photographers, florists, and more directly — no venue
          booking required.
        </p>
      </div>

      {briefActive && (
        <div className="mt-6 rounded-2xl border border-line bg-paper-dim p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-brass-dark">Your brief</p>
              <div className="mt-2">
                <BriefChips brief={brief} />
              </div>
              {brief.description.trim() && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  &ldquo;{brief.description.trim()}&rdquo;
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setEditingBrief((open) => !open)}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
              >
                {editingBrief ? "Done" : "Edit"}
              </button>
              <button
                type="button"
                onClick={() => applyBrief(getEmptyBrief())}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
              >
                Clear
              </button>
            </div>
          </div>

          {/*
            Honest about which fields actually narrow anything. Guest count and
            the description are carried so the planner doesn't retype them when
            they reach out — vendors have no capacity field and no structured
            copy to keyword-match, so filtering on either would be theatre.
            See filterVendorsByBrief().
          */}
          <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-soft">
            Category, date, and budget narrow these results — budget only rules out vendors whose fixed
            starting price is higher, since hourly and day rates aren&apos;t totals. Guest count and your
            description are kept to share with the vendors you contact.
          </p>
        </div>
      )}

      {(editingBrief || !briefActive) && (
        <BriefForm
          key={searchParams.toString()}
          brief={brief}
          onApply={(next) => {
            applyBrief(next);
            setEditingBrief(false);
          }}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city"
          className="w-full max-w-xs rounded-lg border border-line bg-paper px-3.5 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          Remote available
        </label>
        <span className="text-sm text-ink-soft">
          {results.length} vendor{results.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 2xl:grid-cols-3">
            {results.map((vendor) => (
              <VendorProfileCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={vendors.length === 0 ? "No vendors published yet" : "No vendors match that search"}
            description={
              vendors.length === 0
                ? "Vendor profiles appear here once someone joins as a vendor and publishes."
                : "Try a different category, a later date, or a higher budget."
            }
          />
        )}
      </div>
    </div>
  );
}

/**
 * The same six fields as the homepage's Find Vendors tab, so a planner who
 * landed here directly isn't stuck with whatever the URL happened to say.
 * Local state, applied on submit — editing a field shouldn't re-run the
 * search on every keystroke.
 */
function BriefForm({
  brief,
  onApply,
}: {
  brief: VendorSearchBrief;
  onApply: (next: VendorSearchBrief) => void;
}) {
  const [skillSlug, setSkillSlug] = useState<VendorSkillSlug | null>(brief.skillSlug);
  const [eventDate, setEventDate] = useState(brief.eventDate ?? "");
  const [guestCount, setGuestCount] = useState(brief.guestCount?.toString() ?? "");
  const [budget, setBudget] = useState(brief.budget?.toString() ?? "");
  const [description, setDescription] = useState(brief.description);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onApply({
      ...getEmptyBrief(),
      skillSlug,
      eventDate: eventDate || null,
      guestCount: toPositiveInt(guestCount),
      budget: toPositiveInt(budget),
      description,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Vendor search brief"
      className="mt-6 rounded-2xl border border-line bg-paper p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="brief-category" className={LABEL_CLASS}>
            Vendor category
          </label>
          <div className="mt-1.5">
            <VendorCategorySelect
              id="brief-category"
              value={skillSlug}
              onChange={setSkillSlug}
              placeholder="DJ, photographer, florist…"
            />
          </div>
        </div>

        <div>
          <label htmlFor="brief-date" className={LABEL_CLASS}>
            Event date
          </label>
          <input
            id="brief-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className={`mt-1.5 ${INPUT_CLASS}`}
          />
        </div>

        <div>
          <label htmlFor="brief-guests" className={LABEL_CLASS}>
            Guest count
          </label>
          <input
            id="brief-guests"
            type="number"
            inputMode="numeric"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="120"
            className={`mt-1.5 ${INPUT_CLASS}`}
          />
        </div>

        <div>
          <label htmlFor="brief-budget" className={LABEL_CLASS}>
            Budget
          </label>
          <input
            id="brief-budget"
            type="number"
            inputMode="numeric"
            min={1}
            step={50}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="$ total"
            className={`mt-1.5 ${INPUT_CLASS}`}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="brief-needs" className={LABEL_CLASS}>
          What do you need?
        </label>
        <textarea
          id="brief-needs"
          rows={2}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Four hours of coverage, candid style, gallery within two weeks."
          className={`mt-1.5 resize-none ${FIELD_CLASS}`}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-wine px-6 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
        >
          Find vendors
        </button>
        <p className="text-xs text-ink-soft">Location is San Francisco for now.</p>
      </div>
    </form>
  );
}
