"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/providers/AuthProvider";
import { addSubmittedVenue, getAllSlugs } from "@/lib/spaces/submittedVenues";
import { uniqueSlug } from "@/lib/spaces/slug";
import { VENUE_VISUAL_PRESETS } from "@/lib/spaces/visualPresets";
import { resolveAddress } from "@/lib/spaces/geocode";
import { resizeImageFiles } from "@/lib/spaces/imageResize";
import {
  AMENITY_LABELS,
  EVENT_TYPE_LABELS,
  RULE_LABELS,
  SPACE_TYPE_LABELS,
} from "@/lib/spaces/labels";
import LoadingState from "@/components/ui/LoadingState";
import type {
  AmenityKey,
  EventType,
  SpaceType,
  Venue,
  VenueRules,
} from "@/lib/types/spaces";

const MIN_PHOTOS = 7;

const SPACE_TYPE_VALUES = Object.keys(SPACE_TYPE_LABELS) as [SpaceType, ...SpaceType[]];
const EVENT_TYPE_VALUES = Object.keys(EVENT_TYPE_LABELS) as [EventType, ...EventType[]];
const AMENITY_VALUES = Object.keys(AMENITY_LABELS) as [AmenityKey, ...AmenityKey[]];
const RULE_KEYS = Object.keys(RULE_LABELS) as (keyof VenueRules)[];

const STEP_1_FIELDS = [
  "name",
  "tagline",
  "description",
  "address",
  "spaceType",
  "eventTypes",
  "maxCapacity",
  "seatedCapacity",
  "minBookingHours",
  "minHourlyRate",
  "maxHourlyRate",
] as const;

const submissionSchema = z
  .object({
    name: z.string().min(2, "Enter a name for your space"),
    tagline: z.string().min(5, "Add a short one-line tagline"),
    description: z.string().min(20, "Tell organizers a bit more about the space"),
    address: z.string().min(5, "Enter the venue's street address"),
    spaceType: z.enum(SPACE_TYPE_VALUES),
    eventTypes: z.array(z.enum(EVENT_TYPE_VALUES)).min(1, "Pick at least one event type"),
    maxCapacity: z.coerce.number().int().min(1, "Enter a max capacity"),
    seatedCapacity: z.coerce.number().int().min(1, "Enter a seated capacity"),
    minBookingHours: z.coerce.number().int().min(1, "Enter a minimum booking length"),
    minHourlyRate: z.coerce.number().min(0, "Enter an hourly rate"),
    maxHourlyRate: z.coerce.number().min(0, "Enter an hourly rate"),
    availabilityExamples: z.string().optional(),
    amenities: z.array(z.enum(AMENITY_VALUES)),
    rules: z.record(z.string(), z.boolean()),
  })
  .refine((data) => data.maxHourlyRate >= data.minHourlyRate, {
    message: "Max rate should be at least the min rate",
    path: ["maxHourlyRate"],
  })
  .refine((data) => data.maxCapacity >= data.seatedCapacity, {
    message: "Max capacity should be at least seated capacity",
    path: ["maxCapacity"],
  });

type SubmissionInput = z.input<typeof submissionSchema>;
type SubmissionValues = z.output<typeof submissionSchema>;

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

export default function VenueSubmissionForm() {
  const router = useRouter();
  const { user, isLoading, addRole } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [videoNames, setVideoNames] = useState<string[]>([]);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionInput, unknown, SubmissionValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      name: "",
      tagline: "",
      description: "",
      address: "",
      spaceType: "loft",
      eventTypes: [],
      maxCapacity: 50,
      seatedCapacity: 30,
      minBookingHours: 3,
      minHourlyRate: 100,
      maxHourlyRate: 200,
      availabilityExamples: "",
      amenities: [],
      rules: {},
    },
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/sign-in?next=%2Flist-your-venue");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <LoadingState label="Checking your account…" />;
  }

  const currentUser = user;

  async function handlePhotoFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setPhotoError(null);
    setIsProcessingPhotos(true);
    try {
      const files = Array.from(fileList).filter((file) => file.size <= 20 * 1024 * 1024);
      const resized = await resizeImageFiles(files);
      setPhotos((prev) => [...prev, ...resized]);
    } catch {
      setPhotoError("Couldn't process one of those photos — try a different file.");
    } finally {
      setIsProcessingPhotos(false);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleVideoFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setVideoNames((prev) => [...prev, ...Array.from(fileList).map((file) => file.name)]);
  }

  function removeVideo(index: number) {
    setVideoNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleNext() {
    const valid = await trigger(STEP_1_FIELDS);
    if (photos.length < MIN_PHOTOS) {
      setPhotoError(`Add at least ${MIN_PHOTOS} photos (${photos.length} so far).`);
    }
    if (valid && photos.length >= MIN_PHOTOS) setStep(2);
  }

  function onSubmit(values: SubmissionValues) {
    if (photos.length < MIN_PHOTOS) {
      setStep(1);
      setPhotoError(`Add at least ${MIN_PHOTOS} photos (${photos.length} so far).`);
      return;
    }

    const resolved = resolveAddress(values.address);
    const preset = VENUE_VISUAL_PRESETS[0];
    const slug = uniqueSlug(values.name, getAllSlugs());

    const rules: VenueRules = {
      alcoholAllowed: Boolean(values.rules.alcoholAllowed),
      amplifiedMusicAllowed: Boolean(values.rules.amplifiedMusicAllowed),
      outsideCateringAllowed: Boolean(values.rules.outsideCateringAllowed),
      ticketedEventsAllowed: Boolean(values.rules.ticketedEventsAllowed),
      lateNightEventsAllowed: Boolean(values.rules.lateNightEventsAllowed),
      coiRequired: Boolean(values.rules.coiRequired),
      securityDepositRequired: Boolean(values.rules.securityDepositRequired),
    };

    const venue: Venue = {
      // Only ever generated inside this submit handler, never during
      // render — the linter's static purity check can't see that.
      // eslint-disable-next-line react-hooks/purity
      id: `v-${slug}-${Date.now()}`,
      slug,
      name: values.name,
      tagline: values.tagline,
      description: values.description,
      neighborhood: resolved.neighborhood,
      city: "San Francisco",
      coordinates: resolved.coordinates,
      exactAddress: values.address,
      spaceType: values.spaceType,
      eventTypes: values.eventTypes,
      maxCapacity: values.maxCapacity,
      seatedCapacity: values.seatedCapacity,
      minBookingHours: values.minBookingHours,
      minHourlyRate: values.minHourlyRate,
      maxHourlyRate: values.maxHourlyRate,
      images: photos.map((_, i) => String(i + 1)),
      photos,
      videoNames: videoNames.length > 0 ? videoNames : undefined,
      visualAccent: preset.accent,
      icon: preset.icon,
      amenities: values.amenities,
      rules,
      availabilityExamples: (values.availabilityExamples ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      badge: "new",
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
    };

    addSubmittedVenue(venue);
    addRole("venue_operator");
    router.push(`/spaces/${slug}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brass-dark">
          Step {step} of 2
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          {step === 1 ? "Submit your space" : "Requirements & bundled services"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {step === 1
            ? "Photos, price estimates, and availability."
            : "What organizers need to know before booking, and what's included."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-2xl border border-line bg-paper p-6 sm:p-8"
      >
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink">
                Space name
              </label>
              <input
                id="name"
                type="text"
                placeholder="Redline Loft"
                {...register("name")}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
              {errors.name && <p className="mt-1 text-xs text-wine">{errors.name.message}</p>}
            </div>

            <div>
              <label htmlFor="tagline" className="block text-sm font-medium text-ink">
                Tagline
              </label>
              <input
                id="tagline"
                type="text"
                placeholder="A stripped-back loft for shoots and small workshops."
                {...register("tagline")}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
              {errors.tagline && <p className="mt-1 text-xs text-wine">{errors.tagline.message}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-ink">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="What makes this space work, and who it's built for."
                {...register("description")}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
              {errors.description && (
                <p className="mt-1 text-xs text-wine">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-ink">
                  Street address
                </label>
                <input
                  id="address"
                  type="text"
                  placeholder="1450 Folsom St, San Francisco, CA 94103"
                  {...register("address")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
                {errors.address && <p className="mt-1 text-xs text-wine">{errors.address.message}</p>}
                <p className="mt-1 text-xs text-ink-soft">
                  Never shown publicly — organizers only see the general area.
                </p>
              </div>
              <div>
                <label htmlFor="spaceType" className="block text-sm font-medium text-ink">
                  Space type
                </label>
                <select
                  id="spaceType"
                  {...register("spaceType")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  {SPACE_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {SPACE_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Event types this space supports</p>
              <div className="mt-2">
                <Controller
                  control={control}
                  name="eventTypes"
                  render={({ field }) => (
                    <CheckboxGrid
                      options={Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]}
                      selected={field.value}
                      onToggle={(value) =>
                        field.onChange(
                          field.value.includes(value)
                            ? field.value.filter((v) => v !== value)
                            : [...field.value, value]
                        )
                      }
                    />
                  )}
                />
              </div>
              {errors.eventTypes && (
                <p className="mt-1 text-xs text-wine">{errors.eventTypes.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Photos</p>
                <span
                  className={`text-xs font-medium ${
                    photos.length >= MIN_PHOTOS ? "text-brass-dark" : "text-ink-soft"
                  }`}
                >
                  {photos.length} / {MIN_PHOTOS} minimum
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Photos are resized and stored right in your browser — there&apos;s no upload
                server behind this prototype yet.
              </p>

              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {photos.map((photo, index) => (
                    <div key={index} className="group relative aspect-square overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URLs, not a remote image domain */}
                      <img
                        src={photo}
                        alt={`Upload ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        aria-label={`Remove photo ${index + 1}`}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brass hover:text-ink">
                {isProcessingPhotos ? "Processing…" : "Add photos"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isProcessingPhotos}
                  onChange={(event) => {
                    void handlePhotoFiles(event.target.files);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              {photoError && <p className="mt-1 text-xs text-wine">{photoError}</p>}
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Video (optional)</p>
              <p className="text-xs text-ink-soft">
                Attach a walkthrough — playback isn&apos;t available in this prototype yet, but
                it&apos;ll show as included on your listing.
              </p>
              {videoNames.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {videoNames.map((name, index) => (
                    <li
                      key={name + index}
                      className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft"
                    >
                      🎥 {name}
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        aria-label={`Remove ${name}`}
                        className="text-ink-soft hover:text-wine"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-line px-4 py-3 text-sm font-medium text-ink-soft transition-colors hover:border-brass hover:text-ink">
                Add video
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(event) => {
                    handleVideoFiles(event.target.files);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="maxCapacity" className="block text-sm font-medium text-ink">
                  Max capacity
                </label>
                <input
                  id="maxCapacity"
                  type="number"
                  min={1}
                  {...register("maxCapacity")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
                {errors.maxCapacity && (
                  <p className="mt-1 text-xs text-wine">{errors.maxCapacity.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="seatedCapacity" className="block text-sm font-medium text-ink">
                  Seated capacity
                </label>
                <input
                  id="seatedCapacity"
                  type="number"
                  min={1}
                  {...register("seatedCapacity")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
                {errors.seatedCapacity && (
                  <p className="mt-1 text-xs text-wine">{errors.seatedCapacity.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="minBookingHours" className="block text-sm font-medium text-ink">
                  Min booking (hrs)
                </label>
                <input
                  id="minBookingHours"
                  type="number"
                  min={1}
                  {...register("minBookingHours")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              <div>
                <label htmlFor="minHourlyRate" className="block text-sm font-medium text-ink">
                  Min $/hr
                </label>
                <input
                  id="minHourlyRate"
                  type="number"
                  min={0}
                  {...register("minHourlyRate")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
              <div>
                <label htmlFor="maxHourlyRate" className="block text-sm font-medium text-ink">
                  Max $/hr
                </label>
                <input
                  id="maxHourlyRate"
                  type="number"
                  min={0}
                  {...register("maxHourlyRate")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
            </div>
            {(errors.minHourlyRate || errors.maxHourlyRate) && (
              <p className="text-xs text-wine">
                {errors.minHourlyRate?.message ?? errors.maxHourlyRate?.message}
              </p>
            )}

            <div>
              <label htmlFor="availabilityExamples" className="block text-sm font-medium text-ink">
                Availability (one example per line)
              </label>
              <textarea
                id="availabilityExamples"
                rows={2}
                placeholder={"Weeknights after 7pm\nWeekends, all day"}
                {...register("availabilityExamples")}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              />
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-ink">Amenities included</p>
              <p className="text-xs text-ink-soft">
                What&apos;s bundled with the space — equipment, staff, and services.
              </p>
              <div className="mt-2">
                <Controller
                  control={control}
                  name="amenities"
                  render={({ field }) => (
                    <CheckboxGrid
                      options={Object.entries(AMENITY_LABELS) as [AmenityKey, string][]}
                      selected={field.value}
                      onToggle={(value) =>
                        field.onChange(
                          field.value.includes(value)
                            ? field.value.filter((v) => v !== value)
                            : [...field.value, value]
                        )
                      }
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-ink">Venue rules & requirements</p>
              <div className="mt-2 grid gap-2.5">
                {RULE_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2.5 text-sm text-ink">
                    <input
                      type="checkbox"
                      {...register(`rules.${key}` as const)}
                      className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                    />
                    {RULE_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>

            <p className="rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
              Your listing goes live on Discover Spaces immediately after you submit —
              there&apos;s no review step or fee yet in this prototype.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                Publish listing
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
