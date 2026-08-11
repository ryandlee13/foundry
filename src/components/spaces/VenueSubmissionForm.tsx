"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  addSubmittedVenue,
  getAllSlugs,
  getVenuesOwnedBy,
  VenueStorageQuotaError,
} from "@/lib/spaces/submittedVenues";
import { uniqueSlug } from "@/lib/spaces/slug";
import { VENUE_VISUAL_PRESETS } from "@/lib/spaces/visualPresets";
import { resolveAddress } from "@/lib/spaces/geocode";
import { resizeImageFiles } from "@/lib/spaces/imageResize";
import {
  AMENITY_ENTRIES_ALPHABETICAL,
  EVENT_TYPE_LABELS,
  RULE_LABELS,
  SPACE_TYPE_LABELS,
} from "@/lib/spaces/labels";
import {
  venueFormSchema,
  VENUE_FORM_DEFAULT_VALUES,
  STEP_1_FIELDS,
  STEP_2_FIELDS,
  RULE_KEYS,
  SPACE_TYPE_VALUES,
  BOOKING_INCREMENT_OPTIONS,
  MIN_PHOTOS,
  MAX_PHOTOS,
  MAX_PHOTO_FILE_SIZE_MB,
  type VenueFormInput,
  type VenueFormValues,
} from "@/lib/spaces/venueFormSchema";
import {
  getBillingActivationForOwner,
  recordFirstPublishActivation,
  VENUE_SUBSCRIPTION_PLACEHOLDER_COPY,
} from "@/lib/spaces/venueBilling";
import VenueListingReview from "./VenueListingReview";
import LoadingState from "@/components/ui/LoadingState";
import type {
  AmenityKey,
  EventType,
  Venue,
  VenueRules,
} from "@/lib/types/spaces";

type SubmissionInput = VenueFormInput;
type SubmissionValues = VenueFormValues;

function Required() {
  return (
    <span className="text-wine" aria-hidden="true">
      {" "}
      *
    </span>
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

export default function VenueSubmissionForm() {
  const router = useRouter();
  const { user, isLoading, addRole } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reviewValues, setReviewValues] = useState<SubmissionValues | null>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [videoNames, setVideoNames] = useState<string[]>([]);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openNoteFor, setOpenNoteFor] = useState<AmenityKey | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionInput, unknown, SubmissionValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: VENUE_FORM_DEFAULT_VALUES,
  });

  const selectedAmenities = useWatch({ control, name: "amenities" });
  const amenityNotes = useWatch({ control, name: "amenityNotes" });

  function toggleAmenity(value: AmenityKey) {
    const next = selectedAmenities.includes(value)
      ? selectedAmenities.filter((v) => v !== value)
      : [...selectedAmenities, value];
    setValue("amenities", next);
    if (!next.includes(value) && openNoteFor === value) setOpenNoteFor(null);
  }

  function setAmenityNote(value: AmenityKey, note: string) {
    setValue("amenityNotes", { ...amenityNotes, [value]: note });
  }

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
      const incoming = Array.from(fileList);
      const remainingSlots = Math.max(0, MAX_PHOTOS - photos.length);
      const withinCountLimit = incoming.slice(0, remainingSlots);
      const droppedForCount = incoming.length - withinCountLimit.length;

      const oversized = withinCountLimit.filter(
        (file) => file.size > MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024
      );
      const withinSizeLimit = withinCountLimit.filter(
        (file) => file.size <= MAX_PHOTO_FILE_SIZE_MB * 1024 * 1024
      );

      const { photos: resized, failedFileNames } = await resizeImageFiles(withinSizeLimit);
      setPhotos((prev) => [...prev, ...resized]);

      const messages: string[] = [];
      if (oversized.length > 0) {
        messages.push(
          `${oversized.length} photo${oversized.length === 1 ? "" : "s"} skipped — ` +
            `this prototype can only accommodate photos up to ${MAX_PHOTO_FILE_SIZE_MB}MB each ` +
            `(${oversized.map((file) => file.name).join(", ")}).`
        );
      }
      if (failedFileNames.length > 0) {
        messages.push(
          `Couldn't process ${failedFileNames.length === 1 ? "1 photo" : `${failedFileNames.length} photos`} ` +
            `(${failedFileNames.join(", ")}) — try a different file.`
        );
      }
      if (droppedForCount > 0) {
        messages.push(
          `Only added ${incoming.length - droppedForCount} — a listing can have up to ${MAX_PHOTOS} photos.`
        );
      }
      setPhotoError(messages.length > 0 ? messages.join(" ") : null);
    } catch {
      setPhotoError("Couldn't process those photos — try again.");
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
    const hasEnoughPhotos = photos.length >= MIN_PHOTOS;
    if (!hasEnoughPhotos) {
      setPhotoError(`Add at least ${MIN_PHOTOS} photos (${photos.length} so far).`);
    }
    if (valid && hasEnoughPhotos) {
      setStep1Error(null);
      setStep(2);
      return;
    }
    setStep1Error(
      "Please fix the highlighted field(s) below before continuing — details are under each one."
    );
  }

  async function handleReview() {
    const valid = await trigger(STEP_2_FIELDS);
    if (!valid) {
      setStep2Error("Please fix the highlighted field(s) below before continuing.");
      return;
    }
    // RHF hands back raw (string) values for number inputs until zod coerces
    // them — parse here so the review screen shows real numbers, not "50".
    const parsed = venueFormSchema.safeParse(getValues());
    if (!parsed.success) {
      setStep2Error("Please fix the highlighted field(s) below before continuing.");
      return;
    }
    setStep2Error(null);
    setReviewValues(parsed.data);
    setStep(3);
  }

  function onSubmit(values: SubmissionValues) {
    setSubmitError(null);
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
      amenityNotes: Object.fromEntries(
        values.amenities
          .map((key) => [key, values.amenityNotes[key]?.trim()] as const)
          .filter(([, note]) => Boolean(note))
      ),
      rules,
      availabilityExamples: (values.availabilityExamples ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      earliestStartTime: values.earliestStartTime || undefined,
      latestEndTime: values.latestEndTime || undefined,
      bookingIncrementMinutes: values.bookingIncrementMinutes as Venue["bookingIncrementMinutes"],
      capacityNegotiable: values.capacityNegotiable,
      minBookingHoursNegotiable: values.minBookingHoursNegotiable,
      badge: "new",
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };

    const isFirstVenue = getVenuesOwnedBy(currentUser.id).length === 0 && !getBillingActivationForOwner(currentUser.id);

    try {
      addSubmittedVenue(venue);
    } catch (error) {
      setSubmitError(
        error instanceof VenueStorageQuotaError
          ? error.message
          : "Something went wrong saving your listing — try again."
      );
      return;
    }
    if (isFirstVenue) {
      recordFirstPublishActivation(currentUser.id, venue.id);
    }
    addRole("venue_operator");
    router.push(`/spaces/${slug}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brass-dark">
          Step {step} of 3
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          {step === 1 ? "Submit your space" : step === 2 ? "Requirements & bundled services" : "Review and publish"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {step === 1
            ? "Photos, price estimates, and availability."
            : step === 2
              ? "What organizers need to know before booking, and what's included."
              : "Take one more look — you can jump back to fix anything before it goes live."}
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          <span className="text-wine">*</span> Required
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="rounded-2xl border border-line bg-paper p-6 sm:p-8"
      >
        {step === 1 && (
          <div className="space-y-5">
            {step1Error && (
              <p className="rounded-lg bg-wine/10 px-3.5 py-2.5 text-sm text-wine">{step1Error}</p>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ink">
                Space name
                <Required />
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
                <Required />
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
                <Required />
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
                  <Required />
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
                  <Required />
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
              <p className="text-sm font-medium text-ink">
                Event types this space supports
                <Required />
              </p>
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
                <p className="text-sm font-medium text-ink">
                  Photos
                  <Required />
                </p>
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
                  <Required />
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
                  <Required />
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

            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                {...register("capacityNegotiable")}
                className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
              />
              I&apos;ll consider larger groups (I&apos;ll confirm what my space and permits allow)
            </label>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="minBookingHours" className="block text-sm font-medium text-ink">
                  Min booking (hrs)
                  <Required />
                </label>
                <input
                  id="minBookingHours"
                  type="number"
                  min={0}
                  {...register("minBookingHours")}
                  className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                />
                {errors.minBookingHours && (
                  <p className="mt-1 text-xs text-wine">{errors.minBookingHours.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="minHourlyRate" className="block text-sm font-medium text-ink">
                  Min $/hr
                  <Required />
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
                  <Required />
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

            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                {...register("minBookingHoursNegotiable")}
                className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
              />
              I&apos;ll consider shorter bookings
            </label>

            <div>
              <p className="text-sm font-medium text-ink">Booking window (optional)</p>
              <p className="text-xs text-ink-soft">
                Leave blank if you don&apos;t want to state hours. If the end time is earlier
                than the start time, we&apos;ll read it as running past midnight (e.g. 6:00 PM –
                2:00 AM).
              </p>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="earliestStartTime" className="block text-xs font-medium text-ink-soft">
                    Earliest start
                  </label>
                  <input
                    id="earliestStartTime"
                    type="time"
                    {...register("earliestStartTime")}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                  />
                </div>
                <div>
                  <label htmlFor="latestEndTime" className="block text-xs font-medium text-ink-soft">
                    Latest end
                  </label>
                  <input
                    id="latestEndTime"
                    type="time"
                    {...register("latestEndTime")}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                  />
                </div>
              </div>
              {errors.latestEndTime && <p className="mt-1 text-xs text-wine">{errors.latestEndTime.message}</p>}
            </div>

            <div>
              <label htmlFor="bookingIncrementMinutes" className="block text-sm font-medium text-ink">
                Booking increments (optional)
              </label>
              <select
                id="bookingIncrementMinutes"
                {...register("bookingIncrementMinutes")}
                className="mt-1.5 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
              >
                <option value="">No preference</option>
                {BOOKING_INCREMENT_OPTIONS.map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes === 60 ? "1 hour" : `${minutes} minutes`}
                  </option>
                ))}
              </select>
            </div>

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
            {step2Error && (
              <p className="rounded-lg bg-wine/10 px-3.5 py-2.5 text-sm text-wine">{step2Error}</p>
            )}
            <div>
              <p className="text-sm font-medium text-ink">Amenities included</p>
              <p className="text-xs text-ink-soft">
                What&apos;s bundled with the space — equipment, staff, and services. Listed
                alphabetically. Select one, then use the ⓘ button to add a note organizers will
                see on hover — e.g. &quot;2 bathrooms&quot; or &quot;fridge only, no freezer&quot;
                for Kitchen.
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {AMENITY_ENTRIES_ALPHABETICAL.map(([value, label]) => {
                  const checked = selectedAmenities.includes(value);
                  const noteOpen = openNoteFor === value;
                  const note = amenityNotes[value] ?? "";
                  return (
                    <div
                      key={value}
                      className={`rounded-lg border px-3 py-2 ${
                        checked ? "border-brass/60 bg-paper-dim" : "border-line"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAmenity(value)}
                            className="h-4 w-4 shrink-0 rounded border-line text-wine focus:ring-1 focus:ring-brass"
                          />
                          {label}
                        </label>
                        {checked && (
                          <button
                            type="button"
                            onClick={() => setOpenNoteFor(noteOpen ? null : value)}
                            aria-label={
                              note ? `Edit note about ${label}` : `Add a note about ${label}`
                            }
                            title={note || `Add a note about ${label}`}
                            className={`shrink-0 rounded-full px-1.5 text-xs leading-5 ${
                              note
                                ? "text-brass-dark"
                                : "text-ink-soft hover:bg-paper hover:text-ink"
                            }`}
                          >
                            ⓘ
                          </button>
                        )}
                      </div>
                      {checked && noteOpen && (
                        <input
                          type="text"
                          autoFocus
                          value={note}
                          onChange={(event) => setAmenityNote(value, event.target.value)}
                          onBlur={() => setOpenNoteFor(null)}
                          placeholder={`Note for organizers, e.g. "${label} details…"`}
                          className="mt-2 w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass"
                        />
                      )}
                      {checked && !noteOpen && note && (
                        <p className="mt-1 truncate text-xs text-ink-soft" title={note}>
                          {note}
                        </p>
                      )}
                    </div>
                  );
                })}
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-dim"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleReview}
                className="flex-1 rounded-full bg-wine px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-wine-soft"
              >
                Continue to review
              </button>
            </div>
          </div>
        )}

        {step === 3 && reviewValues && (
          <div className="space-y-6">
            <VenueListingReview
              values={reviewValues}
              photos={photos}
              videoNames={videoNames}
              resolvedNeighborhood={resolveAddress(reviewValues.address).neighborhood}
              onEditStep={(target) => setStep(target)}
              billingNotice={
                getVenuesOwnedBy(currentUser.id).length === 0 && !getBillingActivationForOwner(currentUser.id) ? (
                  <div className="border-t border-line pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Subscription</p>
                    <p className="mt-2 text-sm text-ink-soft">{VENUE_SUBSCRIPTION_PLACEHOLDER_COPY}</p>
                  </div>
                ) : null
              }
            />

            <p className="rounded-lg bg-paper-dim px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
              Your listing goes live on Discover Spaces immediately after you publish —
              there&apos;s no admin review step or fee yet in this prototype.
            </p>

            {submitError && (
              <p className="rounded-lg bg-wine/10 px-3.5 py-2.5 text-sm text-wine">
                {submitError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
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
