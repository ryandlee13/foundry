"use client";

import { useState } from "react";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import { PRICING_MODEL_LABELS, EXPERIENCE_LEVEL_LABELS } from "@/lib/vendors/labels";
import { createDraftEventNeed } from "@/lib/vendors/eventNeeds";
import { publishEventNeedAndNotifyVendors } from "@/lib/vendors/publishing";
import type { Booking } from "@/lib/types/spaces";
import type { EventNeed, ExperienceLevel, PricingModel, VendorSkillSlug } from "@/lib/types/vendors";

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
}: {
  booking: Booking;
  organizerId: string;
  publicLocation: string;
  coordinates: { lat: number; lng: number };
  onCreated: (need: EventNeed) => void;
  onCancel: () => void;
}) {
  const [skillSlug, setSkillSlug] = useState<VendorSkillSlug>("dj");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [locationType, setLocationType] = useState<"in_person" | "remote">("in_person");
  const [setupTime, setSetupTime] = useState("");
  const [positionsAvailable, setPositionsAvailable] = useState("1");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [preferredPricingModel, setPreferredPricingModel] = useState<PricingModel | "">("");
  const [equipmentRequirements, setEquipmentRequirements] = useState("");
  const [experiencePreference, setExperiencePreference] = useState<ExperienceLevel | "">("");
  const [portfolioRequired, setPortfolioRequired] = useState(false);
  const [proposalDeadline, setProposalDeadline] = useState(booking.eventDate);
  const [allowQuestions, setAllowQuestions] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && Number(positionsAvailable) > 0;

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
      startTime: booking.startTime,
      endTime: booking.endTime,
      setupTime: setupTime.trim() || null,
      estimatedAttendance: booking.attendees,
      positionsAvailable: Math.max(1, Number(positionsAvailable) || 1),
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: budgetMax ? Number(budgetMax) : null,
      preferredPricingModel: preferredPricingModel || null,
      equipmentRequirements: equipmentRequirements.trim(),
      experiencePreference: experiencePreference || null,
      portfolioRequired,
      proposalDeadline,
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

      <TextField label="Request title" value={title} onChange={setTitle} placeholder={`Looking for a ${VENDOR_SKILLS.find((s) => s.slug === skillSlug)?.name}`} />

      <div>
        <label className="block text-sm font-medium text-ink">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
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
        Date, time, and expected attendance are pulled from this booking: {booking.eventDate}, {booking.startTime}–
        {booking.endTime}, {booking.attendees} guests.
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

      <TextField label="Proposal deadline" type="date" value={proposalDeadline} onChange={setProposalDeadline} />

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
        <button type="button" onClick={handleSaveDraft} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
          Save as draft
        </button>
        <button type="button" onClick={handlePublish} className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
          Publish
        </button>
      </div>
    </div>
  );
}
