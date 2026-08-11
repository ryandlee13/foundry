# Phased Implementation Plan

Each phase should ship as its own focused session/PR. Do not start a phase until the
previous one is working end-to-end. Payments (Stripe) are intentionally not scheduled here
— they come after the booking workflow (Phase 5) is validated with real usage.

## Phase 0 — Foundation (this session)

- Initialize Next.js (TypeScript, Tailwind, ESLint, App Router, `src/`)
- Project documentation (this file and its siblings)
- Application shell: landing page, header, footer, auth page placeholders, protected
  dashboard layout + role dashboard placeholders, 404, shared loading/empty/success/error
  state components
- Supabase client utilities (browser, server, admin) — no live project wired up yet
- `.env.example` and environment documentation
- Lint and build passing

**Exit criteria:** app runs locally, builds cleanly, no real data or auth yet.

## Phase 0.5 — Local-prototype detour (out of sequence, explicit exception)

Before Phase 1 landed, a browser-local (localStorage-backed) prototype of accounts, venue
submission, and instant booking was built at explicit user direction — to validate the
Discover Spaces → list a venue → book a venue loop end-to-end before investing in a real
Supabase project. See `CLAUDE.md` → "Local-prototype layer" for what exists
(`src/lib/auth/`, `src/lib/spaces/submittedVenues.ts`, `src/lib/spaces/bookings.ts`) and
its limits: no real security, no admin approval step, nothing synced across devices.

This is **not** a substitute for Phases 1–4 below — it's scaffolding to be replaced, not
hardened in place. When Phase 1 starts, this prototype layer should be removed and rebuilt
properly against real tables, RLS, and Supabase Auth, not incrementally migrated.

The prototype was later extended (still within this same explicit exception, still
`localStorage`-only) to cover the rest of the venue-owner lifecycle: a real publish-review
step before a listing goes live, post-publish editing (`VenueEditForm.tsx`, never
regenerating `id`/`slug`/`ownerId`), owner-configurable booking hours/increment/
negotiability enforced by `src/lib/spaces/bookingConstraints.ts`, and host-initiated
booking messaging (`src/lib/spaces/bookingWorkflow.ts` — the venue owner, not the planner,
creates the thread). A dev-only seeder (`src/lib/spaces/seedVenueOwner.ts`, `/dev/seed-venues`)
adopts 7 of the seed venues under a real account so this can be tested against owned
listings. See `CLAUDE.md` → "Local-prototype layer" for the full list. None of this changes
the phase boundary above — it's still scaffolding, still replaced wholesale when Phase 1/3
land for real, not migrated incrementally.

## Phase 0.7 — Vendor marketplace local-prototype detour (out of sequence, explicit exception)

Same basis as Phase 0.5, extended to the full vendor/contractor marketplace from
`docs/PRD.md` §4.3/4.4: vendor onboarding and profiles, organizer vendor requests
("Looking for a ___"), Discover Gigs, bidding, proposal review and acceptance, vendor
engagements/roster, post-acceptance messaging, in-app notifications, reviews, and admin
moderation — all built against `localStorage`, at explicit user direction, before Phase 1
(database) and Phase 5 (vendor marketplace) land for real. See `CLAUDE.md` →
"Vendor marketplace (local-prototype layer)" for what exists (`src/lib/vendors/*`) and its
limits.

Key adaptations forced by not having Phase 1's schema yet:
- No `events` table exists, so a confirmed `Booking` stands in as the anchor for an
  organizer's vendor requests (`EventNeed.bookingId`), not a separate `Event` row.
- Vendor profile approval initially followed the *real* gate (`pending_review` → admin
  approves) rather than reusing the venue auto-publish exception; it was later switched to
  publish-immediately too (`publishVendorProfile()`), matching the venue pattern, at the
  same explicit-exception basis — see `CLAUDE.md` rule #8. Admin moderation
  (approve/reject/suspend) still exists as a post-publish action. When Phase 1 lands, real
  pre-publish admin approval should come back for both venues and vendor profiles — this
  prototype's immediate-publish behavior does not carry over.
- The deal-finalization flow requires **both parties** to confirm: an organizer's
  `finalizeDeal()` only sends terms (optionally negotiated), and the vendor must separately
  call `confirmEngagementTerms()` before the engagement is `confirmed`. The locked terms
  are worded as a firm mutual commitment, explicitly not a legal-enforceability claim (see
  `docs/SECURITY.md`) — real contract language is a `TODO(legal)` for before any real
  launch, not something to design further here.
- Competitive bid-summary privacy and message-thread access control are implemented in
  application code with test coverage, but — like the rest of this layer — are not enforced
  by anything a motivated user with devtools couldn't bypass. RLS is not optional for this
  data once Phase 1 lands (see `docs/SECURITY.md`).
- No real email is sent; "email notifications" is a stored preference only.

This is **not** a substitute for Phase 5 below — same "scaffolding to be replaced, not
hardened in place" rule as Phase 0.5.

## Phase 1 — Database migration + RLS

- Create a Supabase project (or connect to an existing one)
- Translate `docs/DATABASE.md` into actual SQL migrations: tables, enums, foreign keys,
  indexes
- Enable RLS on every table; write and test policies per `docs/SECURITY.md`
- Seed a minimal local dataset for development (a few draft venues/vendors)

**Exit criteria:** migrations apply cleanly; RLS policies verified with at least one
positive and one negative test per table (authorized read succeeds, unauthorized read/write
is rejected).

## Phase 2 — Authentication and roles

- Wire up Supabase Auth (email/password to start; magic link optional)
- `profiles` row auto-created via trigger on signup
- Role selection flow: a new user picks organizer/venue operator/vendor (not admin —
  admin is granted manually)
- Server-side session checks on the `(dashboard)` layout and each role-gated route
  (`docs/ROUTES.md`)
- Sign-in/sign-up pages become functional (replacing this session's placeholders)

**Exit criteria:** a user can sign up, pick a role, sign in/out, and reach only the
dashboards their roles permit; direct URL access to an unauthorized dashboard is blocked
server-side.

## Phase 3 — Venue listings + admin approval

- Venue operator: create/edit venue (draft), submit for review
- Public venue directory and detail pages (approved only, no exact address)
- Admin: approval queue, approve/reject with reason, `admin_audit_logs` entries
- Venue photo upload (public bucket) and availability management

**Exit criteria:** a venue operator can list a space, an admin can approve it, and it
appears correctly (without exact address) on the public directory.

## Phase 4 — Event briefs + booking request → quote → documents → confirmation

- Organizer: create event brief
- Organizer: submit structured booking request to an approved venue
- Venue operator: respond with a quote
- Document upload flow (private bucket, signed URLs) for required documents (e.g., COI)
- Organizer: confirm booking once quote accepted and required documents are `reviewed`
- Basic message thread scoped to the booking request/booking

**Exit criteria:** the full organizer journey steps 1–6 from `docs/PRD.md` works
end-to-end with real data and correct authorization at every step.

## Phase 5 — Vendor marketplace

- Vendor: profile creation + admin approval (mirrors Phase 3's pattern)
- Organizer: post event needs against a confirmed (or in-progress) event
- Vendor: browse matching open needs, submit proposals
- Organizer: accept/decline proposals; accepted proposal fills the event need
- Unified organizer dashboard: venue booking + all vendor proposals in one view

**Exit criteria:** the full PRD workflow (steps 1–10) works end-to-end for at least one
vendor category.

The UX for this entire phase — onboarding, matching, bidding, proposal review, engagements,
messaging, notifications, reviews, admin moderation — was already validated end-to-end
against `localStorage` in Phase 0.7. This phase is about rebuilding the same flows against
real tables/RLS/Supabase Auth, not designing them from scratch; see `src/lib/vendors/*` and
`docs/DATABASE.md`'s vendor-marketplace entities for the reference implementation and
schema to port.

## Phase 6 — Polish and hardening

- Full RLS test pass across all tables (automated where practical)
- Error boundaries and loading states wired into real data-fetching routes
- Accessibility pass on the shell and forms
- Performance pass (image optimization for venue/vendor photos, query indexing review)

## Phase 7 — Payments (explicitly deferred)

- Introduce Stripe once the booking workflow above is validated with real usage
- Venue operator subscription billing (monthly, replacing take-rate model referenced in
  `docs/PRD.md`)
- Not scoped further here by design — do not pre-build payment tables/columns before this
  phase starts.
- **Narrow, explicit exception:** `src/lib/spaces/venueBilling.ts` records, client-side,
  that a venue owner's subscription *would* activate on their first published listing —
  one standalone `localStorage` module (`foundry.venues.billingActivations`), not a field
  on `Venue` or `Account`, and deletable in a single `rm` when this phase actually starts.
  It never renders a price (the monthly figure is genuinely undecided) and never talks to
  Stripe or any payment provider. This does not pull any other part of Phase 7 forward —
  no payment tables, no Stripe integration, no real charge — it exists only so the
  venue-owner UX (a subscription-activation notice at publish time) could be validated
  ahead of the real billing build.

---

## Sequencing rules

1. No phase skips ahead of RLS. If Phase 3+ adds a new table, that table gets policies in
   the same PR that introduces it, not "later."
2. UI for a workflow step is not considered done until its server-side authorization and
   validation are also done — a pretty form backed by an unauthenticated action is not a
   deliverable.
3. Each phase should leave `npm run lint` and `npm run build` clean before moving to the
   next.
