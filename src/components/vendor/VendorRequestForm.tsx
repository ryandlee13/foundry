"use client";

import { useState } from "react";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import {
  PRICING_MODEL_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  EVENT_NEED_DESCRIPTION_PLACEHOLDERS,
  GENERIC_EVENT_NEED_DESCRIPTION_PLACEHOLDER,
} from "@/lib/vendors/labels";
import { createDraftEventNeed } from "@/lib/vendors/eventNeeds";
import { publishEventNeedAndNotifyVendors } from "@/lib/vendors/publishing";
import type { Booking } from "@/lib/types/spaces";
import type { EventNeed, ExperienceLevel, PricingModel, VendorSkillSlug } from "@/lib/types/vendors";

type DeadlineQuickOption = "24h" | "3d" | "5d" | "1w" | "custom";

const DEADLINE_QUICK_OPTIONS: { key: DeadlineQuickOption; label: string; hours: number | null }[] = [
  { key: "24h", label: "24 hours", hours: 24 },
  { key: "3d", label: "3 days", hours: 72 },
  { key: "5d", label: "5 days", hours: 120 },
  { key: "1w", label: "1 week", hours: 168 },
  { key: "custom", label: "Custom", hours: null },
];

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
      />
    </div>
  );
}

export default function VendorRequestForm({
  booking,
  organizerId,
  publicLocation,
  coordinates,
  onCreated,
  onCancel,
  lockSkill = false,
  initialSkillSlug,
  initialTitle,
  showPublishButton = true,
}: {
  booking: Booking;
  organizerId: string;
  publicLocation: string;
  coordinates: { lat: number; lng: number };
  onCreated: (need: EventNeed) => void;
  onCancel: () => void;
  /** Hides the skill selector when the caller (e.g. the multi-need builder) already chose it. */
  lockSkill?: boolean;
  initialSkillSlug?: VendorSkillSlug;
  /** e.g. the builder's "Magician"/"Food Sponsor" category label, when it overrides the underlying skill's default name. */
  initialTitle?: string;
  /** When false, only "Save & continue" is shown — the caller (e.g. the builder's review step) handles publishing. */
  showPublishButton?: boolean;
}) {
  const [skillSlug, setSkillSlug] = useState<VendorSkillSlug>(initialSkillSlug ?? "dj");
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [locationType, setLocationType] = useState<"in_person" | "remote">("in_person");
  const [startTime, setStartTime] = useState(booking.startTime);
  const [endTime, setEndTime] = useState(booking.endTime);
  const [setupTime, setSetupTime] = useState("");
  const [positionsAvailable, setPositionsAvailable] = useState("1");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredPricingModel, setPreferredPricingModel] = useState<PricingModel | "">("");
  const [equipmentRequirements, setEquipmentRequirements] = useState("");
  const [experiencePreference, setExperiencePreference] = useState<ExperienceLevel | "">("");
  const [portfolioRequired, setPortfolioRequired] = useState(false);
  const [deadlineOption, setDeadlineOption] = useState<DeadlineQuickOption>("5d");
  const [customDeadline, setCustomDeadline] = useState("");
  const [allowQuestions, setAllowQuestions] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && Number(positionsAvailable) > 0;
  const descriptionPlaceholder = EVENT_NEED_DESCRIPTION_PLACEHOLDERS[skillSlug] ?? GENERIC_EVENT_NEED_DESCRIPTION_PLACEHOLDER;

  function computeProposalDeadline(): string {
    if (deadlineOption === "custom") {
      return customDeadline ? new Date(customDeadline).toISOString() : new Date().toISOString();
    }
    const hours = DEADLINE_QUICK_OPTIONS.find((o) => o.key === deadlineOption)?.hours ?? 120;
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  function buildInput() {
    return {
      bookingId: booking.id,
      organizerId,
      skillSlug,
      title: title.trim(),
      description: description.trim(),
      deliverables: deliverables.trim(),
      locationType,
      publicLocation,
      coordinates,
      eventDate: booking.eventDate,
      startTime,
      endTime,
      setupTime: setupTime.trim() || null,
      estimatedAttendance: booking.attendees,
      positionsAvailable: Math.max(1, Number(positionsAvailable) || 1),
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: budgetMax ? Number(budgetMax) : null,
      preferredPricingModel: preferredPricingModel || null,
      equipmentRequirements: equipmentRequirements.trim(),
      experiencePreference: experiencePreference || null,
      portfolioRequired,
      proposalDeadline: computeProposalDeadline(),
      allowQuestions,
      additionalNotes: additionalNotes.trim(),
    };
  }

  function handleSaveDraft() {
    if (!canSubmit) {
      setError("Add a title, description, and at least one position.");
      return;
    }
    const need = createDraftEventNeed(buildInput());
    onCreated(need);
  }

  function handlePublish() {
    if (!canSubmit) {
      setError("Add a title, description, and at least one position.");
      return;
    }
    const need = createDraftEventNeed(buildInput());
    const published = publishEventNeedAndNotifyVendors(need.id);
    onCreated(published ?? need);
  }

  return (
    <div className="space-y-5">
      {!lockSkill && (
        <div>
          <label className="block text-sm font-medium text-ink">Looking for a…</label>
          <select
            value={skillSlug}
            onChange={(e) => setSkillSlug(e.target.value as VendorSkillSlug)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          >
            {VENDOR_SKILLS.map((skill) => (
              <option key={skill.slug} value={skill.slug}>
                {skill.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <TextField label="Request title" value={title} onChange={setTitle} placeholder={`Looking for a ${VENDOR_SKILLS.find((s) => s.slug === skillSlug)?.name}`} />

      <div>
        <label className="block text-sm font-medium text-ink">What are you looking for?</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={descriptionPlaceholder}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Required deliverables</label>
        <textarea
          rows={2}
          value={deliverables}
          onChange={(e) => setDeliverables(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      <div className="rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs text-ink-soft">
        Event date and expected attendance are pulled from this booking: {booking.eventDate}, {booking.attendees} guests.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink">Vendor start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <p className="mt-1 text-xs text-ink-soft">Defaults to your booking&apos;s start time — edit if this vendor is needed earlier or later.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Vendor end time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Location</label>
        <div className="mt-1.5 flex gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="radio" checked={locationType === "in_person"} onChange={() => setLocationType("in_person")} className="h-4 w-4 border-line text-wine focus:ring-1 focus:ring-brass" />
            In person ({publicLocation})
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="radio" checked={locationType === "remote"} onChange={() => setLocationType("remote")} className="h-4 w-4 border-line text-wine focus:ring-1 focus:ring-brass" />
            Remote
          </label>
        </div>
      </div>

      <TextField label="Setup time (optional)" value={setupTime} onChange={setSetupTime} placeholder="e.g. 30 minutes before start" />

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Positions needed" type="number" value={positionsAvailable} onChange={setPositionsAvailable} />
        <div>
          <label className="block text-sm font-medium text-ink">Preferred pricing model</label>
          <select
            value={preferredPricingModel}
            onChange={(e) => setPreferredPricingModel(e.target.value as PricingModel | "")}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          >
            <option value="">No preference</option>
            {Object.entries(PRICING_MODEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Budget min ($)" type="number" value={budgetMin} onChange={setBudgetMin} />
        <TextField label="Budget max ($)" type="number" value={budgetMax} onChange={setBudgetMax} />
      </div>

      <TextField label="Equipment requirements (optional)" value={equipmentRequirements} onChange={setEquipmentRequirements} />

      <div>
        <label className="block text-sm font-medium text-ink">Experience preference</label>
        <select
          value={experiencePreference}
          onChange={(e) => setExperiencePreference(e.target.value as ExperienceLevel | "")}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        >
          <option value="">No preference</option>
          {Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={portfolioRequired} onChange={(e) => setPortfolioRequired(e.target.checked)} className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass" />
        Require a portfolio link to bid
      </label>

      <div>
        <label className="block text-sm font-medium text-ink">Proposal deadline</label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {DEADLINE_QUICK_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setDeadlineOption(option.key)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                deadlineOption === option.key
                  ? "border-wine bg-wine text-paper"
                  : "border-line text-ink-soft hover:bg-paper-dim"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {deadlineOption === "custom" && (
          <input
            type="datetime-local"
            value={customDeadline}
            onChange={(e) => setCustomDeadline(e.target.value)}
            className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        )}
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={allowQuestions} onChange={(e) => setAllowQuestions(e.target.checked)} className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass" />
        Allow vendors to ask questions before bidding
      </label>

      <div>
        <label className="block text-sm font-medium text-ink">Additional notes (optional)</label>
        <textarea
          rows={2}
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      {error && <p className="text-xs text-wine">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
          Cancel
        </button>
        {showPublishButton ? (
          <>
            <button type="button" onClick={handleSaveDraft} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
              Save as draft
            </button>
            <button type="button" onClick={handlePublish} className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
              Publish
            </button>
          </>
        ) : (
          <button type="button" onClick={handleSaveDraft} className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
            Save &amp; continue
          </button>
        )}
      </div>
    </div>
  );
}
