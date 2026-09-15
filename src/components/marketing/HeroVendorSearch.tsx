"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VendorCategorySelect from "@/components/vendor/VendorCategorySelect";
import { briefToSearchParams, getEmptyBrief } from "@/lib/vendors/vendorSearch";
import { FIELD_CLASS, LABEL_CLASS, LocationField, SUBMIT_CLASS } from "./HeroSearchFields";
import type { VendorSkillSlug } from "@/lib/types/vendors";

const DESCRIPTION_MAX = 300;

/**
 * Vendor search for a planner who already has a venue — the whole point is
 * that this does NOT route through the venue-booking flow. It builds a
 * VendorSearchBrief in the URL and hands it to /vendors.
 *
 * Three of these fields narrow results (category, date via lead time, budget
 * via fixed starting prices); guest count and the description ride along as
 * context for the eventual request. `filterVendorsByBrief` documents why —
 * don't add a fake capacity or keyword filter to make the other two look
 * like they're doing something.
 */
export default function HeroVendorSearch() {
  const router = useRouter();
  const [skillSlug, setSkillSlug] = useState<VendorSkillSlug | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  function toPositiveInt(raw: string): number | null {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.floor(parsed);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = briefToSearchParams({
      ...getEmptyBrief(),
      skillSlug,
      eventDate: eventDate || null,
      guestCount: toPositiveInt(guestCount),
      budget: toPositiveInt(budget),
      description,
    });
    router.push(`/vendors?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Search event vendors">
      <div>
        <label htmlFor="hero-vendor-category" className={LABEL_CLASS}>
          Vendor category
        </label>
        <div className="mt-1.5">
          <VendorCategorySelect
            id="hero-vendor-category"
            value={skillSlug}
            onChange={setSkillSlug}
            placeholder="DJ, photographer, florist…"
          />
        </div>
      </div>

      <LocationField id="hero-vendor-location" />

      <div>
        <label htmlFor="hero-vendor-date" className={LABEL_CLASS}>
          Event date
        </label>
        <input
          id="hero-vendor-date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className={`mt-1.5 ${FIELD_CLASS}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hero-vendor-guests" className={LABEL_CLASS}>
            Guest count
          </label>
          <input
            id="hero-vendor-guests"
            type="number"
            inputMode="numeric"
            min={1}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            placeholder="120"
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
        </div>
        <div>
          <label htmlFor="hero-vendor-budget" className={LABEL_CLASS}>
            Budget
          </label>
          <input
            id="hero-vendor-budget"
            type="number"
            inputMode="numeric"
            min={1}
            step={50}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="$ total"
            className={`mt-1.5 ${FIELD_CLASS}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="hero-vendor-needs" className={LABEL_CLASS}>
          What do you need?
        </label>
        <textarea
          id="hero-vendor-needs"
          rows={3}
          maxLength={DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Four hours of coverage, candid style, gallery within two weeks."
          className={`mt-1.5 resize-none ${FIELD_CLASS}`}
        />
      </div>

      <button type="submit" className={SUBMIT_CLASS}>
        Find vendors
      </button>
    </form>
  );
}
