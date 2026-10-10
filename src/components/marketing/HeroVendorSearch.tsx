"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VendorCategorySelect from "@/components/vendor/VendorCategorySelect";
import { briefToSearchParams, getEmptyBrief } from "@/lib/vendors/vendorSearch";
import {
  FIELD_CLASS,
  FORM_STACK_CLASS,
  LABEL_CLASS,
  LocationField,
  SUBMIT_CLASS,
  TEXTAREA_CLASS,
} from "./HeroSearchFields";
import type { VendorSkillSlug } from "@/lib/types/vendors";

const DESCRIPTION_MAX = 300;

/**
 * Vendor search for a planner who already has a venue — the whole point is
 * that this does NOT route through the venue-booking flow. It builds a
 * VendorSearchBrief in the URL and hands it to /vendors.
 *
 * The browse half of the hero's vendor tab (HeroVendorPanel is the chooser
 * that gets here); posting a gig is the other half and goes to the dashboard.
 *
 * Three of these fields narrow results (category, date via lead time, budget
 * via fixed starting prices) and the description rides along as context for
 * the eventual request. `filterVendorsByBrief` documents why — don't add a
 * fake keyword filter to make the last one look like it's doing something.
 * Guest count is deliberately absent: vendors carry no capacity field, so on
 * a browse form it is a question with no consequence. /vendors still offers it
 * when a planner is refining a brief they're about to send.
 */
export default function HeroVendorSearch() {
  const router = useRouter();
  const [skillSlug, setSkillSlug] = useState<VendorSkillSlug | null>(null);
  const [eventDate, setEventDate] = useState("");
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
      budget: toPositiveInt(budget),
      description,
    });
    router.push(`/vendors?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className={FORM_STACK_CLASS} aria-label="Search event vendors">
      <div>
        <label htmlFor="hero-vendor-category" className={LABEL_CLASS}>
          Vendor category
        </label>
        <div className="mt-1">
          <VendorCategorySelect
            id="hero-vendor-category"
            value={skillSlug}
            onChange={setSkillSlug}
            placeholder="DJ, photographer, florist…"
          />
        </div>
      </div>

      <LocationField />

      <div>
        <label htmlFor="hero-vendor-date" className={LABEL_CLASS}>
          Event date
        </label>
        <input
          id="hero-vendor-date"
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className={`mt-1 ${FIELD_CLASS}`}
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
          className={`mt-1 ${FIELD_CLASS}`}
        />
      </div>

      <div>
        <label htmlFor="hero-vendor-needs" className={LABEL_CLASS}>
          What do you need?
        </label>
        <textarea
          id="hero-vendor-needs"
          rows={2}
          maxLength={DESCRIPTION_MAX}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Four hours of coverage, candid style, gallery within two weeks."
          className={`mt-1 resize-none ${TEXTAREA_CLASS}`}
        />
      </div>

      <button type="submit" className={SUBMIT_CLASS}>
        Find vendors
      </button>
    </form>
  );
}
