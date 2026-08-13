"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import LoadingState from "@/components/ui/LoadingState";
import { resizeImageFile } from "@/lib/spaces/imageResize";
import { resolveAddress } from "@/lib/spaces/geocode";
import { EVENT_TYPE_LABELS } from "@/lib/spaces/labels";
import { VENDOR_SKILLS, getSkillExampleTitle, getSkillName } from "@/lib/vendors/skills";
import { PRICING_MODEL_LABELS } from "@/lib/vendors/labels";
import SkillMultiSelect from "./SkillMultiSelect";
import NotificationPreferencesDialog from "./NotificationPreferencesDialog";
import { buildPortfolioLink, isValidPortfolioUrl } from "@/lib/vendors/portfolioLinks";
import { canOfferRemoteOnly, getRemoteBlockingSkillNames, reconcileRemoteOnly } from "@/lib/vendors/remoteEligibility";
import {
  createDraftVendorProfile,
  getVendorProfileByOwnerId,
  updateVendorProfile,
  getPublishReadiness,
  publishVendorProfile,
} from "@/lib/vendors/profiles";
import MapPreview from "@/components/spaces/MapPreview";
import RadiusSelector from "@/components/spaces/RadiusSelector";
import { SERVICE_RADIUS_OPTIONS_MILES } from "@/lib/types/vendors";
import type { EventType } from "@/lib/types/spaces";
import type {
  PortfolioLink,
  PricingModel,
  ServiceRadiusMode,
  VendorNotificationPreferences,
  VendorProfile,
  VendorService,
  VendorSkillSlug,
} from "@/lib/types/vendors";

const TOTAL_STEPS = 4;
const MIN_DESCRIPTION_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 600;

/** Deep-link target for "List another service" — skips straight to services. */
export const SERVICES_STEP = 2;

const STEP_TITLES = ["Basic information", "Services & portfolio", "Location & availability", "Preview & publish"];

/**
 * Package pricing is deliberately absent: a vendor listing one service
 * prices it as a rate or a flat fee, and "package" only muddied that. The
 * PricingModel type still carries it for existing proposals/engagements —
 * this is the picker's subset, not a type change.
 */
const SERVICE_PRICING_MODELS: PricingModel[] = ["hourly", "flat_fee", "day_rate", "contact_for_quote"];

/** Marks a field the profile genuinely can't publish without. */
function RequiredMark() {
  return (
    <span className="text-wine" aria-hidden>
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
  hint,
  error,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">
        {label}
        {required && <RequiredMark />}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
      />
      {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-xs text-wine">{error}</p>}
    </div>
  );
}

function CheckboxGrid<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: [T, string][];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map(([value, label]) => (
        <label key={value} className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={selected.includes(value)}
            onChange={() => onToggle(value)}
            className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-brass-dark">
        Step {step} of {TOTAL_STEPS}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{STEP_TITLES[step - 1]}</h1>
      <div className="mt-4 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-wine" : "bg-line"}`} />
        ))}
      </div>
    </div>
  );
}

function StepNav({
  step,
  canContinue,
  onBack,
  onContinue,
  continueLabel = "Continue",
}: {
  step: number;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div className="flex gap-3">
      {step > 1 && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Back
        </button>
      )}
      <button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        {continueLabel}
      </button>
    </div>
  );
}

export default function VendorOnboardingFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, addRole } = useAuth();
  // "List another service" deep-links here with ?step=2 — an existing vendor
  // adding a service shouldn't be walked through basic info again.
  const requestedStep = Number(searchParams.get("step"));
  const [step, setStep] = useState(
    Number.isInteger(requestedStep) && requestedStep >= 1 && requestedStep <= TOTAL_STEPS ? requestedStep : 1
  );
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<"photo" | "cover" | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [portfolioDraft, setPortfolioDraft] = useState({ url: "", title: "", description: "" });
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in?next=%2Fdashboard%2Fvendor%2Fonboarding");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    // Reads/creates the localStorage-backed profile client-side only — same
    // hydration-safe reasoning as AuthProvider's session lookup.
    if (!user) return;
    const existing = getVendorProfileByOwnerId(user.id);
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(existing);
      return;
    }
    const [firstName, ...rest] = user.name.trim().split(" ");
    const created = createDraftVendorProfile({
      ownerId: user.id,
      firstName: firstName ?? user.name,
      lastName: rest.join(" "),
      displayName: user.name,
    });
    setProfile(created);
  }, [user]);

  function persist(patch: Partial<VendorProfile>) {
    if (!profile) return;
    const updated = updateVendorProfile(profile.id, patch);
    if (updated) setProfile(updated);
  }

  if (isLoading || !user || !profile) {
    return <LoadingState label="Setting up your vendor profile…" />;
  }

  const readiness = getPublishReadiness(profile);

  async function handleImageUpload(kind: "photo" | "cover", file: File | undefined) {
    if (!file) return;
    setImageError(null);
    setIsProcessingImage(kind);
    try {
      const dataUrl = await resizeImageFile(file);
      persist(kind === "photo" ? { profilePhoto: dataUrl } : { coverImage: dataUrl });
    } catch {
      setImageError("Couldn't process that image — try a different file.");
    } finally {
      setIsProcessingImage(null);
    }
  }

  function addSkill(skill: VendorSkillSlug) {
    if (profile!.skills.includes(skill)) return;
    const skills = [...profile!.skills, skill];
    const services = profile!.services.some((service) => service.skillSlug === skill)
      ? profile!.services
      : [
          ...profile!.services,
          {
            id: crypto.randomUUID(),
            skillSlug: skill,
            title: "",
            description: "",
            pricingModel: "contact_for_quote" as PricingModel,
            startingPrice: null,
            pricingVisible: false,
            equipmentIncluded: "",
            experienceLevel: "intermediate" as const,
            eventTypesServed: [],
          } satisfies VendorService,
        ];

    // If the new skill selection no longer supports remote-only (e.g. a DJ
    // skill was just added), turn a stale remoteOnly claim back off.
    const remoteOnly = reconcileRemoteOnly(skills, profile!.location.remoteOnly);
    persist({ skills, services, location: { ...profile!.location, remoteOnly } });
  }

  function removeSkill(skill: VendorSkillSlug) {
    const skills = profile!.skills.filter((s) => s !== skill);
    const services = profile!.services.filter((service) => service.skillSlug !== skill);
    const remoteOnly = reconcileRemoteOnly(skills, profile!.location.remoteOnly);
    persist({ skills, services, location: { ...profile!.location, remoteOnly } });
  }

  function updateService(skillSlug: VendorSkillSlug, patch: Partial<VendorService>) {
    const services = profile!.services.map((service) =>
      service.skillSlug === skillSlug ? { ...service, ...patch } : service
    );
    persist({ services });
  }

  function addPortfolioLink() {
    setPortfolioError(null);
    if (!isValidPortfolioUrl(portfolioDraft.url)) {
      setPortfolioError("Enter a valid link, starting with https://");
      return;
    }
    const link = buildPortfolioLink({
      url: portfolioDraft.url,
      title: portfolioDraft.title,
      description: portfolioDraft.description,
      displayOrder: profile!.portfolioLinks.length,
    });
    persist({ portfolioLinks: [...profile!.portfolioLinks, link] });
    setPortfolioDraft({ url: "", title: "", description: "" });
  }

  function removePortfolioLink(id: string) {
    persist({ portfolioLinks: profile!.portfolioLinks.filter((link) => link.id !== id) });
  }

  function goNext() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  function saveAsDraft() {
    router.push("/dashboard/vendor");
  }

  function publish() {
    try {
      publishVendorProfile(profile!.id);
      addRole("vendor");
      // Notification preferences are confirmed here rather than as a step —
      // the dialog routes on to the dashboard once saved.
      setShowNotificationPrefs(true);
    } catch {
      setStep(1);
    }
  }

  function saveNotificationPrefs(patch: Partial<VendorNotificationPreferences>) {
    persist({ notificationPreferences: { ...profile!.notificationPreferences, ...patch } });
    setShowNotificationPrefs(false);
    router.push("/dashboard/vendor?published=1");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <StepHeader step={step} />

      <div className="rounded-2xl border border-line bg-paper p-6 sm:p-8">
        {step === 1 && (
          <BasicInfoStep
            profile={profile}
            persist={persist}
            onImageUpload={handleImageUpload}
            isProcessingImage={isProcessingImage}
            imageError={imageError}
          />
        )}
        {step === 2 && (
          <SkillsStep
            profile={profile}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            onUpdateService={updateService}
            portfolioDraft={portfolioDraft}
            setPortfolioDraft={setPortfolioDraft}
            portfolioError={portfolioError}
            onAddPortfolioLink={addPortfolioLink}
            onRemovePortfolioLink={removePortfolioLink}
          />
        )}
        {step === 3 && <LocationStep profile={profile} persist={persist} />}
        {step === 4 && (
          <PreviewStep
            profile={profile}
            readiness={readiness}
            onSaveDraft={saveAsDraft}
            onPublish={publish}
            onEditStep={setStep}
          />
        )}

        {step < TOTAL_STEPS && (
          <div className="mt-8">
            <StepNav step={step} canContinue={canContinueFromStep(step, profile)} onBack={goBack} onContinue={goNext} />
          </div>
        )}
      </div>

      <NotificationPreferencesDialog
        open={showNotificationPrefs}
        preferences={profile.notificationPreferences}
        onSave={saveNotificationPrefs}
      />
    </div>
  );
}

function canContinueFromStep(step: number, profile: VendorProfile): boolean {
  if (step === 1) {
    return profile.displayName.trim().length > 0 && profile.professionalDescription.trim().length >= MIN_DESCRIPTION_LENGTH;
  }
  // Every added service now needs a title and description before moving on —
  // both are marked required on the card.
  if (step === 2) {
    return (
      profile.skills.length > 0 &&
      profile.services.every((service) => service.title.trim().length > 0 && service.description.trim().length > 0)
    );
  }
  return true;
}

function BasicInfoStep({
  profile,
  persist,
  onImageUpload,
  isProcessingImage,
  imageError,
}: {
  profile: VendorProfile;
  persist: (patch: Partial<VendorProfile>) => void;
  onImageUpload: (kind: "photo" | "cover", file: File | undefined) => void;
  isProcessingImage: "photo" | "cover" | null;
  imageError: string | null;
}) {
  const descriptionLength = profile.professionalDescription.length;
  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-soft">
        Fields marked <RequiredMark /> are required to publish.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="First name" required value={profile.firstName} onChange={(v) => persist({ firstName: v })} />
        <TextField label="Last name" required value={profile.lastName} onChange={(v) => persist({ lastName: v })} />
      </div>
      <TextField
        label="Professional display name or business name"
        required
        value={profile.displayName}
        onChange={(v) => persist({ displayName: v })}
        placeholder="DJ Jane / Golden Gate Catering Co."
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-ink">
            Profile photo
            <RequiredMark />
          </p>
          {profile.profilePhoto && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
            <img src={profile.profilePhoto} alt="Profile" className="mt-2 h-16 w-16 rounded-full object-cover" />
          )}
          <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink">
            {isProcessingImage === "photo" ? "Processing…" : profile.profilePhoto ? "Change photo" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                onImageUpload("photo", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div>
          <p className="text-sm font-medium text-ink">Cover image</p>
          {profile.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
            <img src={profile.coverImage} alt="Cover" className="mt-2 h-16 w-full rounded-lg object-cover" />
          )}
          <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-3 py-2 text-xs font-medium text-ink-soft hover:border-brass hover:text-ink">
            {isProcessingImage === "cover" ? "Processing…" : profile.coverImage ? "Change cover" : "Add cover"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                onImageUpload("cover", e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {imageError && <p className="text-xs text-wine">{imageError}</p>}

      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-ink">
            Professional description
            <RequiredMark />
          </label>
          <span className={`text-xs ${descriptionLength >= MIN_DESCRIPTION_LENGTH ? "text-brass-dark" : "text-ink-soft"}`}>
            {descriptionLength} / {MAX_DESCRIPTION_LENGTH}
          </span>
        </div>
        <textarea
          rows={4}
          maxLength={MAX_DESCRIPTION_LENGTH}
          value={profile.professionalDescription}
          onChange={(e) => persist({ professionalDescription: e.target.value })}
          placeholder="Tell organizers what you specialize in, what makes your work distinctive, and what types of events you enjoy working on."
          className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
        />
        <p className="mt-1 text-xs text-ink-soft">
          Required — at least {MIN_DESCRIPTION_LENGTH} characters before this profile can be published.
        </p>
      </div>

      <TextField
        label="Social media"
        value={profile.websiteUrl}
        onChange={(v) => persist({ websiteUrl: v })}
        placeholder="https://instagram.com/… or your website"
        hint="Where organizers can see more of you — a social profile or your own site."
      />
    </div>
  );
}

function SkillsStep({
  profile,
  onAddSkill,
  onRemoveSkill,
  onUpdateService,
  portfolioDraft,
  setPortfolioDraft,
  portfolioError,
  onAddPortfolioLink,
  onRemovePortfolioLink,
}: {
  profile: VendorProfile;
  onAddSkill: (skill: VendorSkillSlug) => void;
  onRemoveSkill: (skill: VendorSkillSlug) => void;
  onUpdateService: (skillSlug: VendorSkillSlug, patch: Partial<VendorService>) => void;
  portfolioDraft: { url: string; title: string; description: string };
  setPortfolioDraft: (draft: { url: string; title: string; description: string }) => void;
  portfolioError: string | null;
  onAddPortfolioLink: () => void;
  onRemovePortfolioLink: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-ink">
          What services do you offer?
          <RequiredMark />
        </p>
        <p className="mb-2 text-xs text-ink-soft">
          Search and add at least one — each one gets its own card below.
        </p>
        <SkillMultiSelect selected={profile.skills} onAdd={onAddSkill} onRemove={onRemoveSkill} />
      </div>

      {profile.services.map((service) => (
        <div key={service.id} className="rounded-xl border border-line p-4">
          <p className="text-sm font-semibold text-ink">{getSkillName(service.skillSlug)}</p>
          <div className="mt-3 space-y-3">
            <TextField
              label="Service title"
              required
              value={service.title}
              onChange={(v) => onUpdateService(service.skillSlug, { title: v })}
              placeholder={getSkillExampleTitle(service.skillSlug)}
            />
            <div>
              <label className="block text-sm font-medium text-ink">
                Short description
                <RequiredMark />
              </label>
              <textarea
                rows={2}
                value={service.description}
                onChange={(e) => onUpdateService(service.skillSlug, { description: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink">Pricing model</label>
                <select
                  value={service.pricingModel}
                  onChange={(e) => onUpdateService(service.skillSlug, { pricingModel: e.target.value as PricingModel })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  {SERVICE_PRICING_MODELS.map((value) => (
                    <option key={value} value={value}>
                      {PRICING_MODEL_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              {service.pricingModel !== "contact_for_quote" && (
                <TextField
                  label="Starting price ($)"
                  type="number"
                  value={service.startingPrice === null ? "" : String(service.startingPrice)}
                  onChange={(v) => onUpdateService(service.skillSlug, { startingPrice: v === "" ? null : Number(v) })}
                />
              )}
            </div>
            {service.pricingModel !== "contact_for_quote" && (
              <label className="flex items-center gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={service.pricingVisible}
                  onChange={(e) => onUpdateService(service.skillSlug, { pricingVisible: e.target.checked })}
                  className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                />
                Show this starting price publicly on my profile
              </label>
            )}
            <TextField
              label="Equipment included (optional)"
              value={service.equipmentIncluded}
              onChange={(v) => onUpdateService(service.skillSlug, { equipmentIncluded: v })}
            />
            <div>
              <p className="text-sm font-medium text-ink">Types of events you serve</p>
              <div className="mt-2">
                <CheckboxGrid
                  options={Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]}
                  selected={service.eventTypesServed}
                  onToggle={(value) =>
                    onUpdateService(service.skillSlug, {
                      eventTypesServed: service.eventTypesServed.includes(value)
                        ? service.eventTypesServed.filter((v) => v !== value)
                        : [...service.eventTypesServed, value],
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="border-t border-line pt-6">
        <p className="text-sm font-medium text-ink">Portfolio links</p>
        <p className="text-xs text-ink-soft">
          Personal site, SoundCloud, YouTube, Instagram, Behance — anywhere organizers can see your work. Not
          required to publish, but strongly recommended.
        </p>
      </div>

      {profile.portfolioLinks.length > 0 && (
        <ul className="space-y-2">
          {profile.portfolioLinks.map((link: PortfolioLink) => (
            <li key={link.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{link.title || link.url}</p>
                <p className="truncate text-xs text-ink-soft">{link.url}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemovePortfolioLink(link.id)}
                className="shrink-0 text-xs font-medium text-wine hover:text-wine-soft"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-xl border border-dashed border-line p-4">
        <TextField
          label="URL"
          value={portfolioDraft.url}
          onChange={(v) => setPortfolioDraft({ ...portfolioDraft, url: v })}
          placeholder="https://soundcloud.com/…"
          error={portfolioError ?? undefined}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Title (optional)" value={portfolioDraft.title} onChange={(v) => setPortfolioDraft({ ...portfolioDraft, title: v })} />
          <TextField label="Description (optional)" value={portfolioDraft.description} onChange={(v) => setPortfolioDraft({ ...portfolioDraft, description: v })} />
        </div>
        <button
          type="button"
          onClick={onAddPortfolioLink}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Add link
        </button>
      </div>
    </div>
  );
}

function LocationStep({ profile, persist }: { profile: VendorProfile; persist: (patch: Partial<VendorProfile>) => void }) {
  const location = profile.location;

  function updateLocation(patch: Partial<VendorProfile["location"]>) {
    persist({ location: { ...location, ...patch } });
  }

  function handleZipBlur() {
    if (!location.homePostalCode) return;
    const resolved = resolveAddress(`${location.homePostalCode} San Francisco, CA`);
    updateLocation({ coordinates: resolved.coordinates, homeCity: location.homeCity || resolved.neighborhood });
  }

  const remoteOnlyAvailable = canOfferRemoteOnly(profile.skills);
  const blockingSkillNames = getRemoteBlockingSkillNames(profile.skills);
  const someRemoteEligible = profile.skills.some((slug) => VENDOR_SKILLS.find((s) => s.slug === slug)?.remoteEligible);

  return (
    <div className="space-y-5">
      {remoteOnlyAvailable && (
        <label className="flex items-center gap-2.5 rounded-lg border border-line bg-paper-dim px-3.5 py-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={location.remoteOnly}
            onChange={(e) => updateLocation({ remoteOnly: e.target.checked, remoteAvailable: e.target.checked ? true : location.remoteAvailable })}
            className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
          />
          I work solely remotely — no physical location or travel radius needed
        </label>
      )}
      {!remoteOnlyAvailable && blockingSkillNames.length > 0 && (
        <p className="text-xs text-ink-soft">
          Remote-only isn&apos;t offered because {blockingSkillNames.join(", ")} {blockingSkillNames.length === 1 ? "requires" : "require"} being on-site.
        </p>
      )}

      {!location.remoteOnly && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="Home city" value={location.homeCity} onChange={(v) => updateLocation({ homeCity: v })} />
            <TextField
              label="ZIP code"
              value={location.homePostalCode}
              onChange={(v) => updateLocation({ homePostalCode: v })}
              hint=""
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">Service address</label>
            <input
              type="text"
              value={location.serviceAddress}
              onChange={(e) => updateLocation({ serviceAddress: e.target.value })}
              placeholder="1450 Folsom St, San Francisco, CA 94103"
              onBlur={handleZipBlur}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
            <p className="mt-1 text-xs text-ink-soft">
              Never shown publicly — used only to measure your travel radius. Organizers only see your general area.
            </p>
          </div>
          <button type="button" onClick={handleZipBlur} className="text-xs font-medium text-brass-dark hover:underline">
            Resolve location from ZIP
          </button>

          <div>
            <label className="block text-sm font-medium text-ink">Service radius</label>
            <select
              value={String(location.radiusMode)}
              onChange={(e) => {
                const value = e.target.value;
                const mode: ServiceRadiusMode = value === "anywhere" || value === "custom" ? value : (Number(value) as ServiceRadiusMode);
                updateLocation({ radiusMode: mode, radiusMiles: typeof mode === "number" ? mode : location.radiusMiles });
              }}
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            >
              {SERVICE_RADIUS_OPTIONS_MILES.map((mi) => (
                <option key={mi} value={mi}>
                  {mi} miles
                </option>
              ))}
              <option value="custom">Custom</option>
              <option value="anywhere">Anywhere</option>
            </select>
            {location.radiusMode === "custom" && (
              <div className="mt-2">
                <TextField
                  label="Custom radius (miles)"
                  type="number"
                  value={String(location.radiusMiles)}
                  onChange={(v) => updateLocation({ radiusMiles: Math.max(1, Number(v) || 1) })}
                />
              </div>
            )}
            {location.radiusMode !== "anywhere" && (
              <div className="mt-3">
                <MapPreview
                  radiusMiles={typeof location.radiusMode === "number" ? location.radiusMode : location.radiusMiles}
                  maxRadiusMiles={100}
                  caption={location.homeCity ? `Radius from ${location.homeCity}` : "Radius preview"}
                />
                <div className="mt-2">
                  <RadiusSelector
                    value={typeof location.radiusMode === "number" ? location.radiusMode : location.radiusMiles}
                    onChange={(radius) => updateLocation({ radiusMode: radius as ServiceRadiusMode, radiusMiles: radius })}
                    options={SERVICE_RADIUS_OPTIONS_MILES}
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={location.willingToTravel}
              onChange={(e) => updateLocation({ willingToTravel: e.target.checked })}
              className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
            />
            Willing to travel beyond my service radius for the right gig
          </label>

          {someRemoteEligible && (
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={location.remoteAvailable}
                onChange={(e) => updateLocation({ remoteAvailable: e.target.checked })}
                className="h-4 w-4 rounded border-line text-wine focus:ring-1 focus:ring-brass"
              />
              Also available for remote work (design, editing, sponsorship, etc.)
            </label>
          )}

          <div>
            <label className="block text-sm font-medium text-ink">Cities or regions served (comma-separated)</label>
            <input
              type="text"
              value={location.citiesServed.join(", ")}
              onChange={(e) => updateLocation({ citiesServed: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="Oakland, San Jose"
              className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
        </>
      )}

      <TextField label="Typical availability" value={location.typicalAvailability} onChange={(v) => updateLocation({ typicalAvailability: v })} placeholder="Weekends, weeknights after 6pm" />
      <TextField label="Lead time required (days)" type="number" value={String(location.leadTimeDays)} onChange={(v) => updateLocation({ leadTimeDays: Math.max(0, Number(v) || 0) })} />
    </div>
  );
}

function PreviewStep({
  profile,
  readiness,
  onSaveDraft,
  onPublish,
  onEditStep,
}: {
  profile: VendorProfile;
  readiness: { ready: boolean; missing: string[] };
  onSaveDraft: () => void;
  onPublish: () => void;
  onEditStep: (step: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-line">
        {profile.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
          <img src={profile.coverImage} alt="" className="h-28 w-full object-cover" />
        ) : (
          <div className="h-28 w-full bg-gradient-to-br from-brass/30 to-wine/20" />
        )}
        <div className="p-4">
          <div className="flex items-center gap-3">
            {profile.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote image domain
              <img src={profile.profilePhoto} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-dim text-lg">
                {profile.displayName.charAt(0) || "?"}
              </div>
            )}
            <div>
              <p className="font-display text-lg font-semibold text-ink">{profile.displayName}</p>
              <p className="text-xs text-ink-soft">{profile.location.homeCity || "San Francisco"}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-soft">{profile.professionalDescription || "No description yet."}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft">
                {VENDOR_SKILLS.find((s) => s.slug === skill)?.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {!readiness.ready && (
        <div className="rounded-lg border border-wine/30 bg-wine/5 px-3.5 py-2.5 text-sm text-wine">
          <p className="font-medium">Before you can publish:</p>
          <ul className="mt-1 list-inside list-disc">
            {readiness.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" onClick={() => onEditStep(1)} className="mt-2 text-xs font-semibold underline">
            Go back and fill these in
          </button>
        </div>
      )}

      <p className="rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
        Publishing makes your profile visible on Discover Vendors immediately — there&apos;s no admin review step in
        this prototype.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
        >
          Save as draft
        </button>
        <button
          type="button"
          disabled={!readiness.ready}
          onClick={onPublish}
          className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          Publish profile
        </button>
      </div>
    </div>
  );
}
