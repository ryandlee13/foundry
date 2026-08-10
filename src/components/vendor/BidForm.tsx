"use client";

import { useState } from "react";
import { PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import { createProposal, editProposal } from "@/lib/vendors/proposals";
import { computeExpiresAt } from "@/lib/vendors/expiration";
import { addPortfolioLinkToProfile } from "@/lib/vendors/profiles";
import { BID_EXPIRATION_DAYS } from "@/lib/types/vendors";
import type { BidExpirationDays, EventNeed, PortfolioLink, PricingModel, VendorProposal } from "@/lib/types/vendors";

type ExpirationOption = BidExpirationDays | "custom";

export default function BidForm({
  need,
  vendorProfileId,
  portfolioLinks,
  existingProposal,
  onSubmitted,
  onCancel,
}: {
  need: EventNeed;
  vendorProfileId: string;
  portfolioLinks: PortfolioLink[];
  existingProposal?: VendorProposal;
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const [proposedAmount, setProposedAmount] = useState(existingProposal ? String(existingProposal.proposedAmount) : "");
  const [pricingModel, setPricingModel] = useState<PricingModel>(existingProposal?.pricingModel ?? need.preferredPricingModel ?? "flat_fee");
  const [message, setMessage] = useState(existingProposal?.message ?? "");
  const [deliverables, setDeliverables] = useState(existingProposal?.deliverables ?? need.deliverables);
  const [equipmentIncluded, setEquipmentIncluded] = useState(existingProposal?.equipmentIncluded ?? "");
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(existingProposal?.availabilityConfirmed ?? false);
  const [setupRequirements, setSetupRequirements] = useState(existingProposal?.setupRequirements ?? "");
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>(existingProposal?.portfolioLinkIds ?? []);
  const [localLinks, setLocalLinks] = useState<PortfolioLink[]>(portfolioLinks);
  const [addingLink, setAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [questionsForOrganizer, setQuestionsForOrganizer] = useState(existingProposal?.questionsForOrganizer ?? "");
  const [expirationOption, setExpirationOption] = useState<ExpirationOption>(5);
  const [customExpiration, setCustomExpiration] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(existingProposal);

  function handleAddLink() {
    if (!newLinkUrl.trim()) return;
    const link = addPortfolioLinkToProfile(vendorProfileId, {
      url: newLinkUrl.trim(),
      title: newLinkTitle.trim(),
      description: "",
    });
    if (link) {
      setLocalLinks((current) => [...current, link]);
      setSelectedLinkIds((current) => [...current, link.id]);
    }
    setNewLinkUrl("");
    setNewLinkTitle("");
    setAddingLink(false);
  }

  function computeProposalExpiresAt(): string {
    const now = new Date().toISOString();
    if (expirationOption === "custom") {
      return customExpiration ? new Date(customExpiration).toISOString() : now;
    }
    return computeExpiresAt(now, expirationOption);
  }

  function handleSubmit() {
    setError(null);
    if (!proposedAmount || Number(proposedAmount) <= 0) {
      setError("Enter a proposed price.");
      return;
    }
    if (need.portfolioRequired && selectedLinkIds.length === 0) {
      setError("This request requires at least one portfolio link.");
      return;
    }
    if (!availabilityConfirmed) {
      setError("Confirm your availability before submitting.");
      return;
    }

    try {
      if (isEditing && existingProposal) {
        editProposal(existingProposal.id, {
          proposedAmount: Number(proposedAmount),
          pricingModel,
          message,
          deliverables,
          equipmentIncluded,
          setupRequirements,
        });
      } else {
        createProposal({
          eventNeedId: need.id,
          vendorProfileId,
          proposedAmount: Number(proposedAmount),
          pricingModel,
          message,
          deliverables,
          equipmentIncluded,
          availabilityConfirmed,
          setupRequirements,
          portfolioLinkIds: selectedLinkIds,
          questionsForOrganizer,
          expiresAt: computeProposalExpiresAt(),
        });
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your proposal.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink">Proposed price ($)</label>
          <input
            type="number"
            value={proposedAmount}
            onChange={(e) => setProposedAmount(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Pricing model</label>
          <select
            value={pricingModel}
            onChange={(e) => setPricingModel(e.target.value as PricingModel)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          >
            {Object.entries(PRICING_MODEL_LABELS)
              .filter(([value]) => value !== "contact_for_quote")
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Proposal message</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Deliverables included</label>
        <textarea
          rows={2}
          value={deliverables}
          onChange={(e) => setDeliverables(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Equipment included</label>
        <input
          type="text"
          value={equipmentIncluded}
          onChange={(e) => setEquipmentIncluded(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Setup requirements</label>
        <input
          type="text"
          value={setupRequirements}
          onChange={(e) => setSetupRequirements(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Relevant portfolio links {need.portfolioRequired && "(required)"}</p>
        <div className="mt-2 space-y-1.5">
          {localLinks.map((link) => (
            <label key={link.id} className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={selectedLinkIds.includes(link.id)}
                onChange={() =>
                  setSelectedLinkIds((prev) => (prev.includes(link.id) ? prev.filter((id) => id !== link.id) : [...prev, link.id]))
                }
                className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
              />
              {link.title || link.url}
            </label>
          ))}
        </div>
        {addingLink ? (
          <div className="mt-2 space-y-2 rounded-lg border border-line p-3">
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAddingLink(false)} className="rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-paper-dim">
                Cancel
              </button>
              <button type="button" onClick={handleAddLink} className="rounded-full bg-wine px-3.5 py-1.5 text-xs font-semibold text-paper hover:bg-wine-soft">
                Add link
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAddingLink(true)} className="mt-2 text-xs font-semibold text-wine hover:underline">
            + Add a link for this bid
          </button>
        )}
      </div>

      {!isEditing && (
        <div>
          <label className="block text-sm font-medium text-ink">Bid expiration</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {BID_EXPIRATION_DAYS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setExpirationOption(days)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  expirationOption === days ? "border-wine bg-wine text-paper" : "border-line text-ink-soft hover:bg-paper-dim"
                }`}
              >
                {days} day{days === 1 ? "" : "s"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setExpirationOption("custom")}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                expirationOption === "custom" ? "border-wine bg-wine text-paper" : "border-line text-ink-soft hover:bg-paper-dim"
              }`}
            >
              Custom
            </button>
          </div>
          {expirationOption === "custom" && (
            <input
              type="datetime-local"
              value={customExpiration}
              onChange={(e) => setCustomExpiration(e.target.value)}
              className="mt-2 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          )}
          <p className="mt-1 text-xs text-ink-soft">
            An expired bid can&apos;t be accepted unless you renew it.
          </p>
        </div>
      )}

      {need.allowQuestions && !isEditing && (
        <div>
          <label className="block text-sm font-medium text-ink">Questions for the organizer (optional)</label>
          <textarea
            rows={2}
            value={questionsForOrganizer}
            onChange={(e) => setQuestionsForOrganizer(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
      )}

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={availabilityConfirmed}
          onChange={(e) => setAvailabilityConfirmed(e.target.checked)}
          className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
        />
        I confirm I&apos;m available for this event&apos;s date and time
      </label>

      {error && <p className="text-xs text-wine">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft">
          {isEditing ? "Save changes" : "Submit bid"}
        </button>
      </div>
    </div>
  );
}
