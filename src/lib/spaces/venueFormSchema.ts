import { z } from "zod";
import {
  AMENITY_ENTRIES_ALPHABETICAL,
  EVENT_TYPE_LABELS,
  RULE_LABELS,
  SPACE_TYPE_LABELS,
} from "@/lib/spaces/labels";
import { publicTitleLeaksRealName } from "@/lib/spaces/venueIdentity";
import type { AmenityKey, EventType, SpaceType, VenueRules } from "@/lib/types/spaces";

/**
 * Shared between VenueSubmissionForm (create, 3-step wizard) and
 * VenueEditForm (edit, single scrolling page) so both validate identically
 * and never drift — the actual duplication risk here is two slightly
 * different validation rules for the same Venue fields, not two similar JSX
 * layouts (which are legitimately different: a wizard vs. a flat form).
 */

export const MIN_PHOTOS = 7;
export const MAX_PHOTOS = 20;
export const MAX_PHOTO_FILE_SIZE_MB = 20;
export const BOOKING_INCREMENT_OPTIONS = [15, 30, 60] as const;

export const SPACE_TYPE_VALUES = Object.keys(SPACE_TYPE_LABELS) as [SpaceType, ...SpaceType[]];
export const EVENT_TYPE_VALUES = Object.keys(EVENT_TYPE_LABELS) as [EventType, ...EventType[]];
export const AMENITY_VALUES = AMENITY_ENTRIES_ALPHABETICAL.map(([key]) => key) as [AmenityKey, ...AmenityKey[]];
export const RULE_KEYS = Object.keys(RULE_LABELS) as (keyof VenueRules)[];

export const STEP_1_FIELDS = [
  "realName",
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
  "earliestStartTime",
  "latestEndTime",
] as const;

export const STEP_2_FIELDS = ["amenities", "amenityNotes", "rules"] as const;

const TIME_FIELD = z
  .string()
  .optional()
  .refine((value) => !value || /^([01]?\d|2[0-3]):[0-5]\d$/.test(value), "Enter a valid time");

export const venueFormSchema = z
  .object({
    /**
     * The operating name. Private — see Venue.realName. Collected so the host
     * can be identified to the planner once a booking is confirmed, and so
     * Foundry knows what the space actually is, but never published.
     */
    realName: z.string().min(2, "Enter your venue's real name"),
    /** The public listing title. Descriptive on purpose — see the leak refine below. */
    name: z.string().min(10, "Describe the space in a few words, e.g. “Sunlit Mission loft with a rooftop deck”"),
    tagline: z.string().min(5, "Add a short one-line tagline"),
    description: z.string().min(20, "Tell organizers a bit more about the space"),
    address: z.string().min(5, "Enter the venue's street address"),
    // No default is pre-selected in the form, so an owner who skips this hits
    // a validation error instead of silently publishing as a "loft". Discover
    // Spaces filters on spaceType, so a wrong one is worse than none. The
    // preprocess turns the select's empty placeholder into undefined — same
    // pattern as bookingIncrementMinutes below.
    spaceType: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.enum(SPACE_TYPE_VALUES, { message: "Pick the type of space this is" })
    ),
    eventTypes: z.array(z.enum(EVENT_TYPE_VALUES)).min(1, "Pick at least one event type"),
    maxCapacity: z.coerce.number().int().min(1, "Enter a max capacity"),
    seatedCapacity: z.coerce.number().int().min(1, "Enter a seated capacity"),
    minBookingHours: z.coerce.number().int().min(0, "Minimum booking length can't be negative"),
    minHourlyRate: z.coerce.number().min(0, "Enter an hourly rate"),
    maxHourlyRate: z.coerce.number().min(0, "Enter an hourly rate"),
    availabilityExamples: z.string().optional(),
    earliestStartTime: TIME_FIELD,
    latestEndTime: TIME_FIELD,
    // Preprocess so the select's "No preference" (empty string) becomes
    // undefined rather than coercing to 0 — z.coerce.number() would happily
    // turn "" into 0, which is a real minute value, not "unset".
    bookingIncrementMinutes: z.preprocess(
      (value) => (value === "" || value === undefined ? undefined : value),
      z.coerce.number().optional()
    ),
    capacityNegotiable: z.boolean(),
    minBookingHoursNegotiable: z.boolean(),
    amenities: z
      .array(z.enum(AMENITY_VALUES))
      .min(1, "Pick at least one amenity so your space can be found"),
    amenityNotes: z.record(z.string(), z.string()),
    /**
     * Every policy needs an explicit answer, not a default.
     *
     * As plain checkboxes, an unticked box meant both "no" and "never looked",
     * and the two are not the same: a space that genuinely forbids alcohol and
     * one whose owner skipped the section produced identical data, and
     * planners filter on it. The form renders Yes/No per policy and this
     * refine is what stops a half-answered set from publishing.
     */
    rules: z
      .record(z.string(), z.boolean())
      .refine((value) => RULE_KEYS.every((key) => typeof value[key] === "boolean"), {
        message: "Answer yes or no for each policy",
      }),
  })
  .refine((data) => data.maxHourlyRate >= data.minHourlyRate, {
    message: "Max rate should be at least the min rate",
    path: ["maxHourlyRate"],
  })
  .refine((data) => data.maxCapacity >= data.seatedCapacity, {
    message: "Max capacity should be at least seated capacity",
    path: ["maxCapacity"],
  })
  .refine((data) => Boolean(data.earliestStartTime) === Boolean(data.latestEndTime), {
    message: "Set both a start and an end time, or leave both blank",
    path: ["latestEndTime"],
  })
  /*
   * The descriptive title only protects the host if it doesn't contain the
   * name. A title that does defeats the whole mechanism — a planner searches
   * it, finds the venue's own site, and books around Foundry. See
   * publicTitleLeaksRealName() for what counts as a leak and why generic words
   * like "loft" are deliberately allowed through.
   */
  .refine((data) => !publicTitleLeaksRealName(data.name, data.realName), {
    message:
      "Your public title gives away the venue's name. Describe the space instead — planners see the real name once they book.",
    path: ["name"],
  });

export type VenueFormInput = z.input<typeof venueFormSchema>;
export type VenueFormValues = z.output<typeof venueFormSchema>;

export const VENUE_FORM_DEFAULT_VALUES: VenueFormInput = {
  realName: "",
  name: "",
  tagline: "",
  description: "",
  address: "",
  // Intentionally unset — see the schema note on spaceType.
  spaceType: "",
  eventTypes: [],
  maxCapacity: 50,
  seatedCapacity: 30,
  minBookingHours: 3,
  minHourlyRate: 100,
  maxHourlyRate: 200,
  availabilityExamples: "",
  earliestStartTime: "",
  latestEndTime: "",
  bookingIncrementMinutes: undefined,
  capacityNegotiable: false,
  minBookingHoursNegotiable: false,
  amenities: [],
  amenityNotes: {},
  rules: {},
};
