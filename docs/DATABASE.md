# Database Design

This document is the schema **proposal**. No migration exists yet — this is written first,
reviewed for internal consistency, and only then translated into SQL migrations in a later
session.

Target: Supabase Postgres. All tables with user data have Row Level Security (RLS) enabled.
`auth.uid()` refers to the authenticated Supabase user id, which equals `profiles.id`.

## Conventions

- Primary keys: `id uuid primary key default gen_random_uuid()`
- Timestamps: `created_at timestamptz not null default now()`, `updated_at timestamptz`
  where rows are mutable
- Status columns are Postgres `enum` types, never free-text
- Money columns: `numeric(10,2)` with an explicit `currency` (`usd` only for MVP)
- Every table storing user data has RLS **enabled**, with explicit policies — no table is
  left publicly readable/writable by default
- "Public" tables (venues, vendor_profiles) still restrict *which rows* and *which columns*
  are exposed to anonymous/other users; there is no case where an entire table is open

---

## 1. `profiles`

One row per Supabase Auth user. This is the single identity — roles are layered on top via
`profile_roles`, not separate accounts.

- **Purpose:** Canonical user identity shared across all roles.
- **Key columns:** `id` (= `auth.users.id`), `full_name`, `avatar_url`, `phone`,
  `created_at`, `updated_at`.
- **FKs:** `id` → `auth.users.id`.
- **Ownership:** A user owns their own profile row.
- **Status values:** none.
- **RLS:**
  - `select`: any authenticated user can read minimal public fields of any profile (needed
    to render "posted by" on listings); full row readable by owner and admins.
  - `update`: owner only (`id = auth.uid()`).
  - `insert`: handled by a trigger on `auth.users` signup, not direct client insert.
  - `delete`: not allowed from the client.

## 2. `profile_roles`

- **Purpose:** Grants a profile one or more of `organizer`, `venue_operator`, `vendor`,
  `admin`. This is the join table that makes multi-role accounts possible without separate
  auth systems.
- **Key columns:** `id`, `profile_id`, `role` (enum: `organizer` | `venue_operator` |
  `vendor` | `admin`), `created_at`.
- **FKs:** `profile_id` → `profiles.id`. Unique constraint on `(profile_id, role)`.
- **Ownership:** Owned by the profile; `admin` role can only be granted by another admin
  (via server-side action, never client insert).
- **Status values:** none.
- **RLS:**
  - `select`: owner and admins.
  - `insert`: owner may insert `organizer`, `venue_operator`, or `vendor` for themselves;
    only admins may insert `admin`. Enforced via server-side check, not just RLS, since the
    role-granting logic needs cross-row validation.
  - `delete`: owner (for their own non-admin roles) or admin.

## 3. `venues`

- **Purpose:** A rentable space listed by a venue operator.
- **Key columns:** `id`, `owner_id`, `name`, `description`, `neighborhood`, `city`
  (`'San Francisco'` for MVP), `exact_address` (**private**, never sent to public API
  responses), `approx_location` (public — neighborhood name only, no street address or
  coordinates precise enough to pinpoint the building), `capacity_min`, `capacity_max`,
  `amenities` (`text[]`), `status` (enum: `draft` | `pending_review` | `approved` |
  `rejected` | `archived`), `rejection_reason`, `created_at`, `updated_at`.
- **FKs:** `owner_id` → `profiles.id`.
- **Ownership:** Venue operator who created it.
- **Status values:** `draft` (editable, not submitted) → `pending_review` (submitted to
  admin) → `approved` (public) / `rejected` (returned with reason, editable back to
  `pending_review`) → `archived` (operator took it down).
- **RLS:**
  - `select`: anyone can read `approved` rows through a **public view that excludes
    `exact_address`**; owner and admins can read the full row including `exact_address`.
  - `insert`: authenticated users with the `venue_operator` role, `owner_id = auth.uid()`.
  - `update`: owner (only while not `approved`, or limited fields once approved — enforced
    server-side) or admin (for `status`/`rejection_reason`).
  - `delete`: owner, only while `draft`.

## 4. `venue_photos`

- **Purpose:** Ordered photo gallery for a venue. Stored in a **public** Supabase Storage
  bucket (marketing images, not sensitive).
- **Key columns:** `id`, `venue_id`, `storage_path`, `sort_order`, `created_at`.
- **FKs:** `venue_id` → `venues.id` (cascade delete).
- **Ownership:** Inherited from the parent venue's owner.
- **Status values:** none.
- **RLS:**
  - `select`: public if parent venue is `approved`; otherwise owner/admin only.
  - `insert`/`update`/`delete`: venue owner or admin.

## 5. `venue_availability`

- **Purpose:** Defines when a venue is rentable (recurring weekly windows and/or specific
  date overrides), so organizers only request real open slots.
- **Key columns:** `id`, `venue_id`, `day_of_week` (nullable, 0–6, for recurring rows),
  `specific_date` (nullable, for one-off overrides), `start_time`, `end_time`,
  `is_available` (bool — supports blocking out a normally-open slot), `created_at`.
- **FKs:** `venue_id` → `venues.id` (cascade delete).
- **Ownership:** Venue owner.
- **Status values:** none (boolean availability, not a workflow state).
- **RLS:**
  - `select`: public if parent venue is `approved`; otherwise owner/admin.
  - `insert`/`update`/`delete`: venue owner or admin.

## 6. `venue_requirements`

- **Purpose:** What an organizer must provide to book this venue (e.g., Certificate of
  Insurance minimum, house rules, quiet hours) — surfaced during the booking request flow
  and used to drive which document types are requested.
- **Key columns:** `id`, `venue_id` (unique — one row per venue), `requires_coi` (bool),
  `min_insurance_amount`, `house_rules` (text), `additional_requirements` (text),
  `updated_at`.
- **FKs:** `venue_id` → `venues.id` (cascade delete, unique).
- **Ownership:** Venue owner.
- **Status values:** none.
- **RLS:**
  - `select`: public if parent venue is `approved`; otherwise owner/admin.
  - `insert`/`update`: venue owner or admin.

## 7. `events`

- **Purpose:** The organizer's event brief — the anchor object for a booking and its
  vendor needs.
- **Key columns:** `id`, `organizer_id`, `title`, `event_type`, `description`,
  `start_datetime`, `end_datetime`, `guest_count`, `budget_min`, `budget_max`,
  `neighborhood_preference`, `status` (enum: `draft` | `planning` | `confirmed` |
  `completed` | `cancelled`), `created_at`, `updated_at`.
- **FKs:** `organizer_id` → `profiles.id`.
- **Ownership:** Organizer who created it.
- **Status values:** `draft` (not yet used to browse/request) → `planning` (actively
  requesting venues/vendors) → `confirmed` (venue booking confirmed) → `completed` (event
  date has passed) → `cancelled`.
- **RLS:**
  - `select`: organizer (owner); admins; and any venue operator / vendor who has an active
    `booking_request`, `booking`, `event_need`, or `proposal` tied to this event (narrow,
    relationship-based read, not a blanket policy).
  - `insert`/`update`/`delete`: organizer only.

## 8. `booking_requests`

- **Purpose:** A structured request from an organizer to a specific venue for a specific
  event.
- **Key columns:** `id`, `event_id`, `venue_id`, `organizer_id` (denormalized for RLS
  simplicity), `requested_start`, `requested_end`, `guest_count`, `message`, `status`
  (enum: `pending` | `quoted` | `accepted_by_organizer` | `declined_by_venue` |
  `withdrawn` | `expired`), `created_at`, `updated_at`.
- **FKs:** `event_id` → `events.id`, `venue_id` → `venues.id`, `organizer_id` →
  `profiles.id`.
- **Ownership:** Organizer creates it; venue owner and organizer both act on it.
- **Status values:** `pending` (awaiting venue response) → `quoted` (venue sent a quote) →
  `accepted_by_organizer` (organizer accepted the quote, becomes a `booking`) /
  `declined_by_venue` / `withdrawn` (organizer cancelled) / `expired`.
- **RLS:**
  - `select`: organizer (owner) and venue owner (via `venue_id`) and admins.
  - `insert`: organizer, must own the referenced `event_id`, and target venue must be
    `approved`.
  - `update`: organizer may update while `pending` or withdraw; venue owner may update
    `status` (e.g., decline) — enforced server-side with explicit allowed-transition
    checks, not just RLS.

## 9. `quotes`

- **Purpose:** A venue operator's priced response to a booking request.
- **Key columns:** `id`, `booking_request_id`, `venue_id`, `price_amount`, `currency`
  (`usd`), `terms`, `required_documents` (`text[]`, e.g. `{coi}`), `status` (enum: `sent` |
  `accepted` | `declined` | `expired` | `superseded`), `expires_at`, `created_at`.
- **FKs:** `booking_request_id` → `booking_requests.id`, `venue_id` → `venues.id`.
- **Ownership:** Venue owner creates it; organizer accepts/declines.
- **Status values:** `sent` → `accepted` (triggers `booking` creation) / `declined` /
  `expired`; a new quote on the same request marks the prior one `superseded`.
- **RLS:**
  - `select`: organizer who owns the parent `booking_request`, venue owner, admins.
  - `insert`: venue owner only, for their own venue's booking request.
  - `update`: organizer may set `accepted`/`declined`; venue owner may set `superseded` by
    issuing a new quote — transitions validated server-side.

## 10. `bookings`

- **Purpose:** The confirmed (or pending-confirmation) reservation of a venue for an event.
  Created when a quote is accepted.
- **Key columns:** `id`, `booking_request_id` (unique), `event_id`, `venue_id`,
  `organizer_id`, `quote_id`, `confirmed_start`, `confirmed_end`, `price_amount`, `status`
  (enum: `pending_documents` | `confirmed` | `cancelled` | `completed`), `created_at`,
  `updated_at`.
- **FKs:** `booking_request_id` → `booking_requests.id` (unique), `event_id` →
  `events.id`, `venue_id` → `venues.id`, `organizer_id` → `profiles.id`, `quote_id` →
  `quotes.id`.
- **Ownership:** Organizer and venue owner both have a stake; both can read, neither can
  unilaterally alter confirmed terms.
- **Status values:** `pending_documents` (quote accepted, awaiting required docs, e.g.
  COI) → `confirmed` (all required documents `reviewed` or waived) → `completed` (event
  date passed) / `cancelled`.
- **RLS:**
  - `select`: organizer, venue owner, admins.
  - `insert`: server-side only (via a function/RPC triggered on quote acceptance), not
    direct client insert.
  - `update`: status transitions restricted to server-side logic with explicit rules
    (e.g., only admin or the relevant party can cancel).

## 11. `documents`

- **Purpose:** Private file records — Certificates of Insurance, IDs, contracts, permits,
  security plans. Files themselves live in a **private** Supabase Storage bucket; this
  table is the metadata/authorization record.
- **Key columns:** `id`, `owner_id` (uploader), `booking_id` (nullable), `proposal_id`
  (nullable), `venue_id` (nullable), `document_type` (enum: `coi` | `id` | `contract` |
  `permit` | `security_plan` | `other`), `storage_path`, `status` (enum: `submitted` |
  `under_review` | `reviewed` | `rejected`), `reviewed_by`, `reviewed_at`,
  `rejection_reason`, `created_at`.
  Exactly one of `booking_id` / `proposal_id` / `venue_id` is set per document, enforced by
  a check constraint — a document always belongs to one specific context.
- **FKs:** `owner_id` → `profiles.id`, `booking_id` → `bookings.id`, `proposal_id` →
  `proposals.id`, `venue_id` → `venues.id`, `reviewed_by` → `profiles.id`.
- **Ownership:** Uploader; visible to the counterparty of the linked context (e.g., the
  venue owner on the other side of the booking) and admins.
- **Status values:** `submitted` → `under_review` (admin or venue operator opened it) →
  `reviewed` (looked at, **not** "verified" or "approved" in any legal sense) /
  `rejected` (with reason, uploader can resubmit).
- **RLS:**
  - `select`: uploader; the counterparty on the linked booking/proposal/venue; admins.
  - `insert`: uploader, must own the referenced context (e.g., is the organizer on the
    booking).
  - `update`: `status`/`reviewed_by`/`reviewed_at` settable only by the reviewing party
    (venue owner or admin) or system, never by the uploader.
  - All file reads happen through **short-lived signed URLs** generated server-side after
    this RLS check passes — the bucket itself is never public and no client ever gets a
    long-lived or public URL to a document.

## 12. `vendor_profiles`

- **Purpose:** A vendor/contractor's public business profile.
- **Key columns:** `id`, `owner_id`, `business_name`, `category` (enum: `dj` |
  `photographer` | `videographer` | `graphic_designer` | `chef` | `caterer` | `security` |
  `influencer` | `sponsor` | `bartender` | `decorator` | `production_agency` | `other`),
  `service_area`, `bio`, `base_price_range`, `status` (enum: `draft` | `pending_review` |
  `approved` | `rejected` | `archived`), `rejection_reason`, `created_at`, `updated_at`.
- **FKs:** `owner_id` → `profiles.id`.
- **Ownership:** Vendor who created it.
- **Status values:** same lifecycle as `venues`: `draft` → `pending_review` → `approved` /
  `rejected` → `archived`.
- **RLS:**
  - `select`: public if `approved`; owner and admins otherwise.
  - `insert`: authenticated users with the `vendor` role, `owner_id = auth.uid()`.
  - `update`: owner (limited once approved) or admin (status fields).
  - `delete`: owner, only while `draft`.

## 13. `vendor_services`

- **Purpose:** Individual service line items a vendor offers (e.g., "4-hour DJ set").
- **Key columns:** `id`, `vendor_profile_id`, `name`, `description`, `price_type` (enum:
  `flat` | `hourly` | `per_guest`), `price_amount`, `created_at`.
- **FKs:** `vendor_profile_id` → `vendor_profiles.id` (cascade delete).
- **Ownership:** Inherited from parent vendor profile owner.
- **Status values:** none.
- **RLS:**
  - `select`: public if parent vendor profile is `approved`; owner/admin otherwise.
  - `insert`/`update`/`delete`: vendor profile owner or admin.

## 14. `event_needs`

- **Purpose:** A specific vendor need posted by an organizer against an event (e.g.,
  "need a photographer, $800–1200 budget").
- **Key columns:** `id`, `event_id`, `organizer_id`, `category` (same enum as vendor
  `category`), `description`, `budget_min`, `budget_max`, `needed_date`, `status` (enum:
  `open` | `in_review` | `filled` | `cancelled`), `created_at`, `updated_at`.
- **FKs:** `event_id` → `events.id`, `organizer_id` → `profiles.id`.
- **Ownership:** Organizer.
- **Status values:** `open` (visible to matching vendors) → `in_review` (organizer
  evaluating proposals) → `filled` (a proposal accepted) / `cancelled`.
- **RLS:**
  - `select`: public (approved vendors with matching category can browse `open` needs);
    full detail to organizer (owner) and admins; vendors see enough to submit a proposal
    without exposing the organizer's private contact info until a proposal is accepted.
  - `insert`/`update`/`delete`: organizer only, must own the referenced event.

## 15. `proposals`

- **Purpose:** A vendor's structured pitch against a posted event need.
- **Key columns:** `id`, `event_need_id`, `vendor_profile_id`, `price_amount`, `message`,
  `status` (enum: `submitted` | `accepted` | `declined` | `withdrawn`), `created_at`,
  `updated_at`.
- **FKs:** `event_need_id` → `event_needs.id`, `vendor_profile_id` → `vendor_profiles.id`.
- **Ownership:** Vendor creates it; organizer (via the event need) accepts/declines.
- **Status values:** `submitted` → `accepted` (marks the event need `filled`) / `declined`
  / `withdrawn` (vendor pulled it back before a decision).
- **RLS:**
  - `select`: vendor owner, organizer who owns the parent event need, admins.
  - `insert`: vendor with an `approved` profile in a matching category, for an `open`
    event need.
  - `update`: vendor may withdraw; organizer may accept/decline — transitions validated
    server-side (e.g., accepting one proposal should decline-or-leave the others,
    handled by server logic, not a trigger that silently mutates unrelated rows).

## 16. `message_threads`

- **Purpose:** Groups messages around one booking/proposal context so conversations aren't
  a flat global inbox.
- **Key columns:** `id`, `context_type` (enum: `booking_request` | `booking` |
  `event_need` | `proposal`), `context_id` (uuid, polymorphic reference), `created_at`.
- **FKs:** none enforced at the DB level (polymorphic); participant/authorization is
  derived server-side from the referenced context row.
- **Ownership:** The two parties implied by the context (e.g., organizer + venue owner for
  a `booking`).
- **Status values:** none.
- **RLS:**
  - `select`: resolved server-side — a security-definer function checks whether
    `auth.uid()` is a party to the referenced context row before allowing thread access;
    admins always allowed.
  - `insert`: system/server-side when a context object is created, not free-form client
    creation.

## 17. `messages`

- **Purpose:** Individual messages within a thread.
- **Key columns:** `id`, `thread_id`, `sender_id`, `body`, `created_at`, `read_at`
  (nullable).
- **FKs:** `thread_id` → `message_threads.id` (cascade delete), `sender_id` →
  `profiles.id`.
- **Ownership:** Sender; readable by all parties on the thread.
- **Status values:** none (read/unread via `read_at`).
- **RLS:**
  - `select`: only participants of the parent thread (same security-definer check as
    `message_threads`) or admins.
  - `insert`: authenticated participant of the thread, `sender_id = auth.uid()`.
  - `update`: sender may not edit `body` after send (MVP keeps messages immutable);
    `read_at` updatable by the recipient only.

## 18. `admin_audit_logs`

- **Purpose:** Immutable record of admin actions (approvals, rejections, document review
  decisions) for accountability.
- **Key columns:** `id`, `admin_id`, `action` (text, e.g. `venue.approved`), `target_table`,
  `target_id`, `metadata` (jsonb), `created_at`.
- **FKs:** `admin_id` → `profiles.id`.
- **Ownership:** System-written, admin-attributed.
- **Status values:** none (append-only).
- **RLS:**
  - `select`: admins only.
  - `insert`: server-side only (service role or security-definer function invoked by
    admin actions), never direct client insert.
  - `update`/`delete`: disallowed entirely — append-only table.

---

## Vendor marketplace schema extension

The vendor marketplace UX (onboarding, Discover Gigs, bidding, engagements, messaging,
reviews, admin moderation — see `docs/PRD.md` §4.3/4.4) was prototyped end-to-end against
`localStorage` (`src/lib/vendors/*`, see `CLAUDE.md` → "Vendor marketplace
(local-prototype layer)") before this real schema below was migrated. This section
extends/reconciles §12–17 above with what the prototype actually needed. When Phase 1
lands, reconcile against this rather than the original §12–17 sketch, which predates it.

- **`vendor_profiles`** (extends §12): also needs `first_name`, `last_name`,
  `profile_photo_path`, `cover_image_path`, `website_url`, `instagram_url`,
  `home_region`, `home_postal_code`, `latitude`, `longitude`, `radius_mode` (enum:
  `5`|`10`|`25`|`50`|`100`|`custom`|`anywhere`), `radius_miles`, `willing_to_travel` (bool),
  `remote_available` (bool), `cities_served` (`text[]`), `typical_availability` (text),
  `lead_time_days`, `average_rating` (numeric, nullable), `review_count`,
  `completed_event_count`, `rejection_reason`. `status` gains `suspended` alongside the
  existing `draft`/`pending_review`/`approved`/`rejected`/`archived` — note the prototype
  code calls the public-facing value `published` rather than `approved`; reconcile the
  enum label when migrating. Notification preferences (in-app/email toggles, per-category
  booleans, per-skill triggers, match-scope) live as a `vendor_notification_preferences`
  join table per the original proposal — the prototype embeds them directly on the profile
  record for simplicity, which is not appropriate once this is a real table.
- **`vendor_skills`** (standard catalog, per original proposal): the prototype's canonical
  list of 23 skills/slugs lives in `src/lib/vendors/skills.ts` — port this list verbatim as
  the seed data for the real table, including each skill's `remote_eligible` flag.
- **`vendor_services`** (extends §13): also needs `pricing_visible` (bool — false means the
  starting price is for internal/organizer-facing context only, never rendered publicly),
  `equipment_included` (text), `experience_level` (enum: `new`|`intermediate`|
  `experienced`|`veteran`), `event_types_served` (`text[]`, reusing the `event_type` enum
  from §7's `events`/`event_type`).
- **`vendor_portfolio_links`**: per original proposal (`id`, `vendor_profile_id`, `url`,
  `title`, `description`, `provider` enum, `display_order`). Provider is auto-detected from
  the URL's hostname client-side (`src/lib/vendors/portfolioLinks.ts`) — no external API
  call, so this is safe to keep as-is.
- **`event_needs`** (extends §14): **no `events` table exists in the prototype**, so
  `event_need.booking_id` → `bookings.id` stands in for `event_need.event_id` → `events.id`
  until Phase 4's `events` table is real and this can be corrected. Also needs
  `deliverables` (text), `location_type` (enum: `in_person`|`remote`), `public_location`
  (text — never the booking's/venue's exact address), `latitude`/`longitude`,
  `start_time`/`end_time`/`setup_time`, `estimated_attendance`, `positions_available`,
  `positions_filled`, `preferred_pricing_model`, `equipment_requirements`,
  `experience_preference`, `portfolio_required` (bool), `proposal_deadline`,
  `allow_questions` (bool), `additional_notes`, `published_at`. `status` gains
  `draft`|`paused` alongside `open`(→`published`)/`in_review`/`filled`(→`closed`)/`cancelled`
  — reconcile naming.
- **`proposals`** (extends §15, prototype calls this `vendor_proposals`): also needs
  `pricing_model`, `deliverables`, `equipment_included`, `availability_confirmed` (bool),
  `setup_requirements`, `portfolio_link_ids` (`uuid[]` or join table), `questions_for_
  organizer`, `expires_at`. `status` gains `draft`|`shortlisted`|`expired`|`canceled`.
  **Bid expiration is computed at read time from `expires_at`, never written by a
  scheduled job** (`src/lib/vendors/expiration.ts`) — a `submitted`/`shortlisted` proposal
  past `expires_at` is treated as `expired` by every read path without a status-column
  mutation. Preserve this "no background-job infrastructure" pattern in the real
  implementation unless a real scheduler already exists for another reason. Enforce
  "one active proposal per vendor per event_need" as a partial unique index
  (`vendor_profile_id, event_need_id`) where `status in ('submitted','shortlisted')`,
  mirrored in the prototype by `findActiveProposal()`.
- **`vendor_engagements`** (per original proposal, not yet in §12–17): `id`,
  `event_need_id`, `booking_id` (see the `event_id`→`booking_id` note above),
  `organizer_id`, `vendor_profile_id`, `accepted_proposal_id`, `agreed_amount`,
  `pricing_model`, `agreed_deliverables`, `status` (enum: `confirmed`|`in_progress`|
  `completed`|`canceled_by_organizer`|`canceled_by_vendor`|`disputed`), `completed_at`,
  `canceled_at`. Created only via an "accept proposal" transaction that also fills one
  `event_need` position (auto-closing it once full) and unlocks the message thread — see
  `acceptProposal()` in `src/lib/vendors/engagements.ts` for the reference transaction
  shape to port into a Postgres function/RPC.
  - **RLS:** `select`: the organizer, the accepted vendor, and admins only. `insert`:
    server-side only, as part of the accept-proposal transaction. `update`: status
    transitions restricted server-side (only the organizer marks `completed`/
    `canceled_by_organizer`; only the vendor sets `canceled_by_vendor`).
- **`vendor_reviews`** (per original proposal): `id`, `engagement_id` (unique),
  `organizer_id`, `vendor_profile_id`, `overall_rating` (1–5), five optional category
  ratings (`quality`/`communication`/`reliability`/`professionalism`/`value`),
  `review_text`, `would_work_with_again` (bool), `vendor_response` (nullable text, settable
  once), `status` (enum: `published`|`hidden`|`flagged`|`removed`), `flagged_reason`.
  - **Eligibility, enforced both server-side and by a unique constraint on
    `engagement_id`:** the engagement must be `completed`, the requesting organizer must be
    the one on the engagement, and no review may already exist for it — see
    `checkReviewEligibility()` for the reference logic to port into a server-side check.
  - **RLS:** `select`: public if `status = 'published'`; owner (organizer) and admins can
    see all statuses; the reviewed vendor can see their own reviews at any status.
    `insert`: organizer only, subject to the eligibility check above. `update`: the
    organizer may never edit a review after posting; the vendor may only set
    `vendor_response` once; only admins may change `status`.
  - Average rating and review count on `vendor_profiles` are a materialized aggregate over
    `published` reviews only (recomputed on every review status change) — see
    `computeAverageRating()`.
- **`vendor_event_portfolio`** (per original proposal): `id`, `vendor_profile_id`,
  `engagement_id` (unique), `display_publicly` (bool, defaults `false`), `display_title`,
  `display_description`, `event_date`, `skill_id`. Auto-created (hidden) when an engagement
  is marked `completed`; the vendor opts in per-item to show it publicly. **This is a
  distinct, real-completed-event mechanism — do not confuse with or extend the fake-review
  pattern used for seed venues (`src/lib/spaces/reviews.ts`); every row here traces back to
  a real `vendor_engagements` row.**
  - **RLS:** `select`: public if `display_publicly = true` and the parent review isn't
    `removed`; owner and admins otherwise. `update`: vendor owner (visibility/copy only) or
    admin/organizer (removal of an inaccurate entry, per `docs/PRD.md`).
- **`notifications`** (per original proposal, generic — shared by both roles): `id`,
  `recipient_id`, `type` (enum, see `src/lib/types/vendors.ts` `NotificationType` for the
  full list spanning both vendor- and organizer-facing events), `title`, `body`, `link`,
  `read` (bool), `created_at`.
  - **De-duplication:** creating a batch of notifications for the same `type` + `link`
    skips any recipient who already has one, even across separate calls — see
    `selectRecipientsNeedingNotification()`. Preserve this when porting to avoid notification
    spam from repeated actions (e.g. re-publishing a paused event need).
  - **No real email is ever sent by this prototype** — "email enabled" is a stored
    preference only. Wiring an actual transactional-email send is real Phase 2/5 work, not
    something to bolt onto the prototype.
  - **RLS:** `select`/`update` (mark read): owner (`recipient_id = auth.uid()`) only.
    `insert`: server-side only, as a side effect of the action that triggered it.
- **`message_threads` / `messages`** (extends §16/§17): add
  `vendor_engagement_id` → `vendor_engagements.id` as a third possible `context_type` (or,
  simpler in the prototype's actual shape, `message_threads.engagement_id` directly, since
  the prototype never generalized to a polymorphic `context_type`/`context_id` pair for
  vendor threads — every vendor-related thread has exactly one `engagement_id`).
  **A thread must not be creatable except as part of the accept-proposal transaction** —
  see `getOrCreateThreadForEngagement()`, called only from `acceptProposal()`. This is the
  concrete mechanism behind `docs/SECURITY.md`'s "chat cannot be accessed before
  acceptance" requirement.

---

## Status Enum Summary

| Table | Enum | Values |
|---|---|---|
| `profile_roles` | `app_role` | `organizer`, `venue_operator`, `vendor`, `admin` |
| `venues` | `listing_status` | `draft`, `pending_review`, `approved`, `rejected`, `archived` |
| `events` | `event_status` | `draft`, `planning`, `confirmed`, `completed`, `cancelled` |
| `booking_requests` | `booking_request_status` | `pending`, `quoted`, `accepted_by_organizer`, `declined_by_venue`, `withdrawn`, `expired` |
| `quotes` | `quote_status` | `sent`, `accepted`, `declined`, `expired`, `superseded` |
| `bookings` | `booking_status` | `pending_documents`, `confirmed`, `cancelled`, `completed` |
| `documents` | `document_status` | `submitted`, `under_review`, `reviewed`, `rejected` |
| `vendor_profiles` | `listing_status` (shared) | `draft`, `pending_review`, `approved`, `rejected`, `archived` |
| `event_needs` | `event_need_status` | `open`, `in_review`, `filled`, `cancelled` |
| `proposals` | `proposal_status` | `submitted`, `accepted`, `declined`, `withdrawn` |

`listing_status` is shared between `venues` and `vendor_profiles` since both go through the
identical admin-approval lifecycle.

## Key State Transitions

```
booking_request: pending -> quoted -> accepted_by_organizer -> (booking created)
                            \-> declined_by_venue
                 pending/quoted -> withdrawn | expired

quote:           sent -> accepted | declined | expired
                 sent -> superseded (when a new quote is issued for the same request)

booking:         pending_documents -> confirmed -> completed
                 pending_documents/confirmed -> cancelled

document:        submitted -> under_review -> reviewed | rejected
                 rejected -> submitted (resubmission)

event_need:      open -> in_review -> filled | cancelled

proposal:        submitted -> accepted | declined | withdrawn
                 (accepting one proposal on an event_need moves that need to `filled`)

venue / vendor_profiles listing_status:
                 draft -> pending_review -> approved | rejected
                 approved -> archived
                 rejected -> pending_review (after edits)
```

## Cross-cutting RLS principles

1. **Enable RLS on every table above — no exceptions.**
2. Ownership checks compare `auth.uid()` against a denormalized owner/party column
   directly on the row being accessed wherever possible, to keep policies simple and fast.
   Where the relationship is indirect (e.g., `message_threads`), a `security definer`
   helper function resolves participancy instead of a deep join in the policy itself.
3. Public read policies never expose `exact_address` (venues) or private contact fields —
   those are only ever returned by server-side code after an authorization check, and
   ideally via a dedicated public view/RPC that excludes the sensitive columns entirely
   rather than relying on clients to not request them.
4. Anything that mutates cross-row state (accepting a quote creates a booking; accepting a
   proposal fills an event need) is done via a server-side function/RPC running with
   elevated privileges after re-validating the request — not a client-side chain of three
   separate table writes.
5. `admin` role is never grantable by a client-side insert; it is seeded/managed by
   existing admins through server-side code only.
