# Route Structure

Routes below marked **Public**, **Auth-only**, or **Role-gated** describe the intended
authorization for each route once auth is implemented. This session builds the pages as
placeholders; the guards described here land in the auth-implementation phase
(`docs/IMPLEMENTATION_PLAN.md`, Phase 2).

## Public routes

| Route | Purpose |
|---|---|
| `/` | Landing page — value proposition for all three audiences, CTA into sign-up |
| `/sign-in` | Functional against the local-prototype auth layer (see `CLAUDE.md`) — not real Supabase Auth |
| `/sign-up` | Same prototype layer; role picked at signup, more can be added to the account later |
| `/spaces` | Discover Spaces — venue discovery/filtering UI over local + submitted venues, no backend yet (see below) |
| `/spaces/[slug]` | Venue detail — booking is functional against the local-prototype `bookings` store; requests start `pending` until the owner accepts from `/dashboard/venue` (no quote step) |
| `/list-your-venue` | Real (prototype) venue submission form — gated on being signed in, 3-step wizard ending in a review step + "Publish listing", publishes immediately with no admin review (scoped exception, see `docs/SECURITY.md` #9) |
| `/about` | "Coming soon" placeholder |
| `/vendors` | Vendor directory — real (prototype), lists `published` vendor profiles with skill/remote/search filters |
| `/vendors/[slug]` | Public vendor detail — real (prototype), only ever renders a `status === "published"` profile; draft/pending/rejected/suspended profiles 404 client-side (see `VendorProfileLookup`) |
| `/dev/seed-vendors` | Dev-only trigger for `src/lib/vendors/seed.ts` fictional demo data; 404s when `NODE_ENV === "production"` |
| `/dev/seed-venues` | Dev-only trigger for `src/lib/spaces/seedVenueOwner.ts` — creates a real-email venue-owner account and adopts 7 seed venues under it; 404s when `NODE_ENV === "production"` |

### `/spaces` — Discover Spaces

Built ahead of Phase 3's real venue directory as a UI-only prototype: filtering,
sorting, and the location/radius picker all run client-side against local dummy data in
`src/lib/spaces/venues.ts` (see `docs/IMPLEMENTATION_PLAN.md`). No table backs this route
yet and no network calls are made. When Phase 3 lands, `venues`/`venue_photos`/etc. will
need additional columns (space type, amenities, rules) to back this UI with real data —
`docs/DATABASE.md` does not yet reflect those fields. Distances and locations use
neighborhood-level coordinates only, consistent with the `exact_address` rule in
`docs/SECURITY.md`.

### Vendor marketplace routes

Built ahead of Phase 5's real vendor marketplace as a full UI+business-logic prototype
against `localStorage` (`src/lib/vendors/*`) — see `CLAUDE.md` → "Vendor marketplace
(local-prototype layer)" for what exists and its limits. Unlike Discover Spaces, this
prototype includes multi-step workflows with real authorization checks written in
application code (ownership checks on bookings/needs/proposals/engagements/threads,
admin-only gates) — but, like the rest of this layer, nothing here is backed by RLS, so
those checks are bypassable by a user with devtools access to their own browser's
`localStorage`. That is an accepted limitation of this phase, not a bug to silently patch
with more client-side checks — the fix is real RLS in Phase 1/5.

## Auth-only routes (any authenticated user, regardless of role)

| Route | Purpose |
|---|---|
| `/dashboard` | Entry point. Currently shows all four role sections with the user's actual roles marked, rather than redirecting to a single one. |

**Current state vs. target:** `src/app/(dashboard)/dashboard/layout.tsx` today performs a
**client-side** check against the local-prototype auth context and redirects to
`/sign-in` if signed out. Per `docs/SECURITY.md` rule #3, a client-side guard is UX only —
this is explicitly a temporary stand-in, not the real gate, because there's no server
session to check yet (no Supabase Auth). The target design below (server-side session +
per-route role check) is still what Phase 2 should build; this prototype does not
implement per-role gating on the sub-routes at all yet.

## Role-gated routes (target design — not yet enforced this way)

All routes under `/dashboard/*` share the protected dashboard layout
(`src/app/(dashboard)/layout.tsx`), which performs a **server-side** session check before
rendering anything. Role-specific sub-routes additionally check that the user holds the
required role in `profile_roles` — checked server-side, not inferred from which link they
clicked.

| Route | Role required | Purpose |
|---|---|---|
| `/dashboard/organizer` | `organizer` | Organizer home: bookings list, Messages link, "Find vendors" link gated on `status === "confirmed"` |
| `/dashboard/organizer/events/new` *(future)* | `organizer` | Create event brief |
| `/dashboard/organizer/events/[id]` *(future)* | `organizer` | Manage one event end-to-end |
| `/dashboard/organizer/bookings/[bookingId]/vendors` | `organizer` (owner of the booking) | Real (prototype) — list/create/publish vendor requests ("Looking for a ___") for one booking, plus the Vendor Roster (per-need "N of M found" count, vendor profile photo, price, running total via `computeRosterSpend()`) of confirmed engagements. Anchored to a `Booking`, not an `Event` row — see `CLAUDE.md` |
| `/dashboard/organizer/bookings/[bookingId]/vendors/[needId]/proposals` | `organizer` (owner of the need) | Real (prototype) — proposal comparison/sort, shortlist/decline, "Finalize Deal" (`FinalizeDealDialog` — keep proposal terms or edit them) sends terms and shows "Awaiting Vendor Confirmation" until the vendor accepts |
| `/dashboard/organizer/reviews/[engagementId]` | `organizer` (owner of the engagement) | Real (prototype) — leave a review after an engagement is marked `completed` |
| `/dashboard/venue` | `venue_operator` | Venue operator home: listings with "Live since" date, incoming booking requests, "Go to messages"/"Open conversation" per confirmed booking |
| `/dashboard/venue/listings/new` *(future — use `/list-your-venue`)* | `venue_operator` | Submit a new venue listing |
| `/dashboard/venue/listings/[id]` | `venue_operator` | Real (prototype) — edit an owned listing (`VenueEditForm.tsx`); never changes `id`/`slug`/`ownerId` |
| `/dashboard/vendor` | `vendor` | Real (prototype) — profile status, active/expiring bids, confirmed gigs count, rating |
| `/dashboard/vendor/onboarding` | `vendor` | Real (prototype) — 6-step profile creation/publish flow |
| `/dashboard/vendor/gigs` | `vendor` | Real (prototype) — Discover Gigs, matched by skill + location/remote, filters, transparent match-reason text |
| `/dashboard/vendor/gigs/[id]` | `vendor` | Real (prototype) — opportunity detail, competitive bid summary, Place a Bid |
| `/dashboard/vendor/bids` | `vendor` | Real (prototype) — active/all bids, withdraw/renew |
| `/dashboard/vendor/confirmed` | `vendor` | Real (prototype) — engagements pending vendor confirmation (`AgreedTermsCard` + Confirm/Decline) and confirmed engagements (message link, cancel) |
| `/dashboard/vendor/profile` *(future)* | `vendor` | Manage vendor profile and services (currently folded into onboarding — no separate edit page yet) |
| `/dashboard/vendor/reviews` | `vendor` | Real (prototype) — received reviews, respond/flag, toggle public Foundry event history |
| `/dashboard/vendor/settings` *(future)* | `vendor` | Notification preferences currently only editable during onboarding, not standalone |
| `/dashboard/messages` | any authenticated user | Real (prototype) — conversation list grouped by event/booking; covers two thread kinds: proposal threads (organizer-created, via "Start Conversation" or finalizing a deal — do not require acceptance) and booking threads (venue-owner-created only, via "Go to messages" on a confirmed booking) |
| `/dashboard/messages/[threadId]` | thread participant only | Real (prototype) — chat, gated by `isThreadParticipant()`; header branches on thread kind (`ProposalThreadHeader`/`BookingThreadHeader`) |
| `/dashboard/notifications` | any authenticated user | Real (prototype) — in-app notification list, mark read/all read |
| `/dashboard/admin` | `admin` | Real (prototype) — vendor profile approval queue, event-need moderation, flagged-review moderation, audit log. No self-serve way to become admin (by design, mirrors `docs/DATABASE.md` §2 — grant manually) |
| `/dashboard/admin/venues` *(future)* | `admin` | Venue approval queue |
| `/dashboard/admin/vendors` *(future)* | `admin` | Superseded by the "Vendor profiles" tab on `/dashboard/admin` above |

## Error/utility routes

| Route | Purpose |
|---|---|
| `not-found.tsx` | Custom 404 for any unmatched route |
| (route-level `error.tsx`) *(future)* | Per-segment error boundaries as data fetching is added |

## Authorization enforcement notes

- The `(dashboard)` layout performs the session check once for every nested route — no
  dashboard page individually re-implements "am I logged in," but role-specific pages do
  still independently verify their required role server-side (a missing role check in one
  page must not be masked by the shared layout only checking "logged in").
- Client-side navigation guards (hiding a nav link) are a UX convenience only. Every
  protected page's actual data access is re-validated server-side and by RLS, per
  `docs/SECURITY.md`. Directly visiting a URL you're not authorized for must redirect or
  403, never silently render another user's data.
