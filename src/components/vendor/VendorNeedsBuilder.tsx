"use client";

import { useState } from "react";
import { publishEventNeedAndNotifyVendors } from "@/lib/vendors/publishing";
import { cancelEventNeed } from "@/lib/vendors/eventNeeds";
import VendorRequestForm from "./VendorRequestForm";
import VendorNeedReviewSummary from "./VendorNeedReviewSummary";
import type { Booking } from "@/lib/types/spaces";
import type { EventNeed, VendorSkillSlug } from "@/lib/types/vendors";

/**
 * The categories offered when building a multi-need vendor request, mapped
 * onto the existing VENDOR_SKILLS catalog (see src/lib/vendors/skills.ts) —
 * a few labels here override the underlying skill's default name rather
 * than introducing new skill enum values (e.g. "Food Sponsor"/"Magician"),
 * the same pattern EventNeed.title already uses to override a skill's name.
 */
const CATEGORY_OPTIONS: { label: string; skillSlug: VendorSkillSlug }[] = [
  { label: "DJ", skillSlug: "dj" },
  { label: "Photographer", skillSlug: "photographer" },
  { label: "Videographer", skillSlug: "videographer" },
  { label: "Florist", skillSlug: "florist" },
  { label: "Private Chef", skillSlug: "chef" },
  { label: "Caterer", skillSlug: "caterer" },
  { label: "Bartender", skillSlug: "bartender" },
  { label: "Graphic Designer", skillSlug: "graphic_designer" },
  { label: "Marketing Influencer", skillSlug: "influencer" },
  { label: "Content Creator", skillSlug: "content_creator" },
  { label: "Photo Booth", skillSlug: "photo_booth" },
  { label: "Magician", skillSlug: "performer" },
  { label: "Performer", skillSlug: "performer" },
  { label: "Sponsor", skillSlug: "sponsor" },
  { label: "Food Sponsor", skillSlug: "sponsor" },
  { label: "Lighting", skillSlug: "lighting_technician" },
  { label: "Sound Engineer", skillSlug: "sound_engineer" },
  { label: "Security", skillSlug: "security" },
  { label: "Event Producer", skillSlug: "event_producer" },
  { label: "Decorator", skillSlug: "decorator" },
  { label: "Other", skillSlug: "other" },
];

type Step = "pick" | "fill" | "review";

export default function VendorNeedsBuilder({
  booking,
  organizerId,
  publicLocation,
  coordinates,
  eventLabel,
  onDone,
  onCancel,
}: {
  booking: Booking;
  organizerId: string;
  publicLocation: string;
  coordinates: { lat: number; lng: number };
  eventLabel: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [selected, setSelected] = useState<(typeof CATEGORY_OPTIONS)[number][]>([]);
  const [fillIndex, setFillIndex] = useState(0);
  const [draftedNeeds, setDraftedNeeds] = useState<EventNeed[]>([]);
  const [publishing, setPublishing] = useState(false);

  function toggleCategory(option: (typeof CATEGORY_OPTIONS)[number]) {
    setSelected((current) =>
      current.some((c) => c.label === option.label)
        ? current.filter((c) => c.label !== option.label)
        : [...current, option]
    );
  }

  function handleStartFilling() {
    if (selected.length === 0) return;
    setFillIndex(0);
    setStep("fill");
  }

  function handleNeedCreated(need: EventNeed) {
    setDraftedNeeds((current) => [...current, need]);
    if (fillIndex + 1 < selected.length) {
      setFillIndex((i) => i + 1);
    } else {
      setStep("review");
    }
  }

  function handleEdit(needId: string) {
    // Drafts are never published until the final step, so it's safe to cancel the
    // stray draft and re-open the form for the same category slot.
    const index = draftedNeeds.findIndex((n) => n.id === needId);
    if (index === -1) return;
    cancelEventNeed(needId);
    setDraftedNeeds((current) => current.filter((n) => n.id !== needId));
    setFillIndex(index);
    setStep("fill");
  }

  function handlePublishAll() {
    setPublishing(true);
    for (const need of draftedNeeds) {
      publishEventNeedAndNotifyVendors(need.id);
    }
    setPublishing(false);
    onDone();
  }

  if (step === "pick") {
    return (
      <div className="space-y-5">
        <p className="text-sm text-ink-soft">Select every type of vendor this event needs — you can request multiple at once.</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((option) => {
            const isSelected = selected.some((c) => c.label === option.label);
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => toggleCategory(option)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isSelected ? "border-wine bg-wine text-paper" : "border-line text-ink hover:bg-paper-dim"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartFilling}
            disabled={selected.length === 0}
            className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with {selected.length || 0} vendor{selected.length === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "fill") {
    const current = selected[fillIndex];
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Vendor {fillIndex + 1} of {selected.length} · {current.label}
        </p>
        <VendorRequestForm
          key={`${current.label}-${fillIndex}`}
          booking={booking}
          organizerId={organizerId}
          publicLocation={publicLocation}
          coordinates={coordinates}
          lockSkill
          initialSkillSlug={current.skillSlug}
          initialTitle={current.label}
          showPublishButton={false}
          onCreated={handleNeedCreated}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">Review each request before publishing. Vendors matching each category will be notified.</p>
      <div className="space-y-4">
        {draftedNeeds.map((need) => (
          <VendorNeedReviewSummary key={need.id} need={need} eventLabel={eventLabel} onEdit={() => handleEdit(need.id)} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onDone} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
          Save all as drafts
        </button>
        <button
          type="button"
          onClick={handlePublishAll}
          disabled={publishing}
          className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:opacity-50"
        >
          Publish {draftedNeeds.length} Vendor Request{draftedNeeds.length === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
