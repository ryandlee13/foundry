"use client";

import { useState } from "react";
import { VENDOR_SKILLS } from "@/lib/vendors/skills";
import {
  PRICING_MODEL_LABELS,
  EVENT_NEED_DESCRIPTION_PLACEHOLDERS,
  GENERIC_EVENT_NEED_DESCRIPTION_PLACEHOLDER,
} from "@/lib/vendors/labels";
import {
  computeNeedBudget,
  formatBudgetPreview,
  REQUESTABLE_PRICING_MODELS,
} from "@/lib/vendors/needBudget";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { createDraftEventNeed } from "@/lib/vendors/eventNeeds";
import { publishEventNeedAndNotifyVendors } from "@/lib/vendors/publishing";
import type { VendorRequestContext } from "@/lib/vendors/requestContext";
import type { EventNeed, PricingModel, VendorSkillSlug } from "@/lib/types/vendors";

type DeadlineQuickOption = "24h" | "3d" | "5d" | "1w" | "custom";

const DEADLINE_QUICK_OPTIONS: { key: DeadlineQuickOption; label: string; hours: number | null }[] = [
  { key: "24h", label: "24 hours", hours: 24 },
  { key: "3d", label: "3 days", hours: 72 },
  { key: "5d", label: "5 days", hours: 120 },
  { key: "1w", label: "1 week", hours: 168 },
  { key: "custom", label: "Custom", hours: null },
];

/** Red asterisk marking a field the form won't submit without. */
function Required() {
  return (
    <span className="text-wine" aria-hidden="true">
      {" "}
      *
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">
        {label}
        {required && <Required />}
      </label>
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
  context,
  organizerId,
  onCreated,
  onCancel,
  lockSkill = false,
  initialSkillSlug,
  initialTitle,
  showPublishButton = true,
}: {
  context: VendorRequestContext;
  organizerId: string;
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
  const [locationType, setLocationType] = useState<"in_person" | "remote">("in_person");
  const [startTime, setStartTime] = useState(context.startTime);
  const [endTime, setEndTime] = useState(context.endTime);
  const [setupTime, setSetupTime] = useState("");
  const [positionsAvailable, setPositionsAvailable] = useState("1");
  const [preferredPricingModel, setPreferredPricingModel] = useState<PricingModel | "">("");
  const [targetPrice, setTargetPrice] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [portfolioRequired, setPortfolioRequired] = useState(false);
  const [deadlineOption, setDeadlineOption] = useState<DeadlineQuickOption>("5d");
  const [customDeadline, setCustomDeadline] = useState("");
  const [allowQuestions, setAllowQuestions] = useState(true);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const budgetInput = {
    pricingModel: preferredPricingModel,
    targetPrice,
    startTime,
    endTime,
    minOverride: budgetMin,
    maxOverride: budgetMax,
  };
  const budgetPreview = formatBudgetPreview(budgetInput);

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
    const budget = computeNeedBudget(budgetInput);
    return {
      bookingId: context.bookingId,
      organizerId,
      skillSlug,
      title: title.trim(),
      description: description.trim(),
      // Deliverables, equipment, and experience preference were separate
      // fields that "What are you looking for?" already covers — asking for
      // the same information three ways produced three thin answers instead
      // of one useful one. The stored fields remain so existing needs and the
      // vendor-side readers keep working.
      deliverables: "",
      locationType,
      publicLocation: context.publicLocation,
      coordinates: context.coordinates,
      eventDate: context.eventDate,
      startTime,
      endTime,
      setupTime: setupTime.trim() || null,
      estimatedAttendance: context.attendees,
      positionsAvailable: Math.max(1, Number(positionsAvailable) || 1),
      budgetMin: budget.budgetMin,
      budgetMax: budget.budgetMax,
      preferredPricingModel: preferredPricingModel || null,
      equipmentRequirements: "",
      experiencePreference: null,
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
          <label className="block text-sm font-medium text-ink">
            Vendor category
            <Required />
          </label>
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

      <TextField
        label="Request title"
        required
        value={title}
        onChange={setTitle}
        placeholder={`Looking for a ${VENDOR_SKILLS.find((s) => s.slug === skillSlug)?.name}`}
      />

      <div>
        <label className="block text-sm font-medium text-ink">
          What are you looking for?
          <Required />
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={descriptionPlaceholder}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <p className="mt-1 text-xs text-ink-soft">
          Cover the deliverables you need and any gear they should bring — this is the whole
          brief vendors bid against.
        </p>
      </div>

      <div className="rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs text-ink-soft">{context.sourceNote}</div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink">Vendor start time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Defaults to the event&apos;s start time — edit if this vendor is needed earlier or later.
          </p>
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
            In person ({context.publicLocation})
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="radio" checked={locationType === "remote"} onChange={() => setLocationType("remote")} className="h-4 w-4 border-line text-wine focus:ring-1 focus:ring-brass" />
            Remote
          </label>
        </div>
      </div>

      <TextField label="Setup time (optional)" value={setupTime} onChange={setSetupTime} placeholder="e.g. 30 minutes before start" />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Positions needed"
          required
          type="number"
          value={positionsAvailable}
          onChange={setPositionsAvailable}
        />
        <div>
          <label className="block text-sm font-medium text-ink">Preferred pricing model</label>
          <select
            value={preferredPricingModel}
            onChange={(e) => setPreferredPricingModel(e.target.value as PricingModel | "")}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          >
            <option value="">No preference</option>
            {/* Day rates, packages, and contact-for-quote are vendor-side
                concepts — an organizer asking for work states a rate or a
                fee. See REQUESTABLE_PRICING_MODELS. */}
            {REQUESTABLE_PRICING_MODELS.map((model) => (
              <option key={model} value={model}>
                {PRICING_MODEL_LABELS[model]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">
          {preferredPricingModel === "hourly" ? "Hourly rate ($)" : "Price ($)"}
        </label>
        <input
          type="number"
          min={1}
          value={targetPrice}
          onChange={(e) => setTargetPrice(e.target.value)}
          placeholder={preferredPricingModel === "hourly" ? "80" : "500"}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        {/* An hourly rate becomes a total using this request's own vendor
            window, so the figure the organizer sees is the one vendors bid
            against. */}
        {budgetPreview ? (
          <p className="mt-1.5 text-sm font-medium text-ink">
            {budgetPreview}
            {preferredPricingModel === "hourly" && (
              <span className="ml-1 font-normal text-ink-soft">
                — what vendors will see as your budget
              </span>
            )}
          </p>
        ) : (
          <p className="mt-1 text-xs text-ink-soft">
            {preferredPricingModel === "hourly"
              ? "We'll work out the total from the vendor hours above."
              : "The total you're budgeting for this vendor."}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="Budget min ($, optional)" type="number" value={budgetMin} onChange={setBudgetMin} />
        <TextField label="Budget max ($, optional)" type="number" value={budgetMax} onChange={setBudgetMax} />
      </div>
      <p className="-mt-2 text-xs text-ink-soft">
        Leave these blank to use the price above. Set them if you already know the range
        you&apos;ll accept.
      </p>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" checked={portfolioRequired} onChange={(e) => setPortfolioRequired(e.target.checked)} className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass" />
        Require a portfolio link to bid
      </label>

      <div>
        <div className="flex items-center gap-1.5">
          <label className="block text-sm font-medium text-ink">Proposal deadline</label>
          <InfoTooltip label="What is the proposal deadline?">
            How long this request stays open for bids. After it passes, vendors can no longer
            submit, and any bids still waiting on you expire.
          </InfoTooltip>
        </div>
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
