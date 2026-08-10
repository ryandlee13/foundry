# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

## What this is

An event marketplace connecting organizers, venue operators, and vendors in San Francisco.
Full product context lives in `docs/`:

- `docs/PRD.md` — problem, roles, user journeys, MVP scope
- `docs/ARCHITECTURE.md` — stack and system shape
- `docs/DATABASE.md` — schema proposal, ownership, RLS per table
- `docs/ROUTES.md` — route structure and authorization
- `docs/SECURITY.md` — mandatory security rules
- `docs/IMPLEMENTATION_PLAN.md` — phased build order

Read the relevant doc before working in that area. Do not re-derive product decisions that
are already documented — update the doc if a decision changes.

## Non-negotiable rules

These come directly from `docs/SECURITY.md` — treat any violation as a bug, not a style
choice:

1. `SUPABASE_SERVICE_ROLE_KEY` is read only in server-only files. Never import it into
   anything reachable from a client component.
2. Every table with user data has RLS enabled with explicit per-operation policies.
   No table ships "temporarily open."
3. Protected actions are authorized server-side (Server Action / Route Handler
   re-checks the session and ownership). Hidden buttons and client-side route guards are
   UX only, never the actual gate.
4. Validate all server-side input with Zod, even if a client-side validator already ran.
5. `venues.exact_address` never appears in a public/anonymous-reachable query or payload.
   The venue submission form collects a real street address (`Venue.exactAddress`) and
   resolves it to a public neighborhood + coordinates via
   `src/lib/spaces/geocode.ts` (a heuristic stand-in for a real geocoding API — no token
   configured, see that file's header). `exactAddress` must never be rendered in any
   component reachable from a public page.
6. Private documents (COI, IDs, contracts, permits, security plans) live in a private
   Storage bucket and are only ever accessed via short-lived signed URLs.
7. Never describe an uploaded document as "verified" or "approved" in a legal sense. Use
   `submitted` / `under review` / `reviewed`.
8. Venue listings and vendor profiles are public only when `status = 'approved'`, set only
   by an admin action. **Scoped exception:** venues submitted through
   `/list-your-venue` (see `src/components/spaces/VenueSubmissionForm.tsx`) publish to
   Discover Spaces immediately with no admin review, at explicit user direction, since
   there's no real backend yet to review against (see "Local-prototype layer" below). This
   must gain a real approval step before any real launch — don't extend the "skip review"
   pattern to anything else without the same explicit approval. **Vendor profiles do not
   use this exception** — `submitVendorProfileForReview()` moves a profile to
   `pending_review`, and it only becomes publicly visible after an admin (`/dashboard/admin`)
   calls `approveVendorProfile()`. `VendorProfileLookup` enforces `status === "published"`
   before rendering anything publicly. Keep it this way; don't collapse it into the venue
   auto-publish pattern.
9. No secrets or real credentials in source-controlled files. `.env.example` holds names
   and placeholders only.

## Stack

Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage) + Zod +
React Hook Form. No Stripe yet — payments are a deliberately deferred phase
(`docs/IMPLEMENTATION_PLAN.md`, Phase 7).

## Working conventions

- Don't add libraries beyond what a task needs. Check `package.json` before adding a
  dependency that might already be covered by what's installed.
- Keep components small; avoid premature abstraction. Three similar call sites is fine —
  don't build a generic system for a pattern that's only appeared twice.
- Strict TypeScript. Avoid `any`; if it's genuinely unavoidable, comment why at the exact
  line.
- Run `npm run lint` and `npm run build` before considering a change finished. Fix errors;
  don't suppress them.
- Follow the phased plan in `docs/IMPLEMENTATION_PLAN.md` — don't build Phase 4 features
  while Phase 1 (real database migrations) hasn't landed yet, even if it seems faster to
  jump ahead.
- Placeholder/marketing copy must not claim things that aren't true yet (no fake reviews,
  no fake activity counts, no "verified" claims on unreviewed documents). **Scoped
  exception:** the homepage "Event recaps" carousel
  (`src/components/marketing/RecapCarousel.tsx`) and the venue-detail "events hosted" stat
  + reviews (`src/components/spaces/VenueReviews.tsx`) use invented names/quotes as
  explicitly-approved dummy filler until real testimonials exist, using initials-only
  avatars rather than real photos. `VenueReviews` is gated to seed venues
  (`venue.ownerId === null`) specifically so a real user's freshly-submitted listing never
  shows fake reviews — don't remove that gate. Don't extend this pattern elsewhere (e.g.
  the community slideshow deliberately avoids claiming past events were "hosted on
  Foundry") without the same explicit approval, and replace this content with real
  reviews before a real launch. **Vendor reviews (`src/lib/vendors/reviews.ts`) are
  explicitly NOT part of this exception** — they are only ever created via `createReview()`
  after a real completed engagement, gated by `checkReviewEligibility()`. Do not add a
  fake-review generator for vendors the way `src/lib/spaces/reviews.ts` does for seed
  venues without the same explicit approval this exception required.

## Local-prototype layer (auth, venue listings, bookings)

A browser-local prototype of accounts, venue submission, and booking now exists ahead of
the real Phase 1 (database) and Phase 2 (auth) work in `docs/IMPLEMENTATION_PLAN.md` — a
deliberate, explicit exception to "don't build later phases before Phase 1," made because
no Supabase project is connected in this environment and the user wanted the UX validated
now rather than waiting.

- `src/lib/auth/storage.ts` — "accounts" and the current session live in `localStorage`.
  No password is ever persisted or checked against anything; there is no real security
  boundary. Read the file header before touching it.
- `src/lib/spaces/submittedVenues.ts` — venue listings submitted via `/list-your-venue`
  live in `localStorage`, merged with the seed `VENUES` array at render time. They exist
  only in the browser that created them. Photos are real (user-selected files, resized
  client-side to a JPEG data URL by `src/lib/spaces/imageResize.ts` and stored directly
  on the venue record — there's no upload server) with a 7-photo minimum enforced in
  `VenueSubmissionForm.tsx`. Video attachments are metadata-only (`Venue.videoNames`) —
  the bytes aren't persisted, since a single clip would blow localStorage's per-origin
  quota; the listing just shows "video walkthrough included."
- `src/lib/spaces/bookings.ts` — booking requests start `pending`; the venue owner
  accepts/declines from `/dashboard/venue` (`updateBookingStatus`). There's still no
  quote/negotiation step, just a single accept/decline, and no real-time push — the
  "notification" is a badge computed on page load from local data, not a live event.
- None of this is real. Before a real launch, all of it needs: a real Supabase project,
  the `docs/DATABASE.md` schema (extended with space type/amenities/rules/photos columns
  and real Storage-backed uploads — see `docs/ROUTES.md`), RLS policies per
  `docs/SECURITY.md`, real Supabase Auth, a real geocoding API in place of
  `src/lib/spaces/geocode.ts`, and Server Actions that re-validate everything
  server-side per rule #3 above. Do not treat this layer as a starting point to "harden"
  incrementally — it's a UX prototype to be replaced, not extended toward production.

## Vendor marketplace (local-prototype layer)

The full vendor/contractor marketplace (onboarding, Discover Gigs, bidding, proposal
review, engagements, messaging, notifications, reviews, admin moderation) was built the
same way and at the same explicit-exception basis as the section above — ahead of the real
Phase 1/2/5 work, entirely against `localStorage`, with the same "no real security
boundary" caveat. See `docs/PRD.md` §4.3/4.4 and `docs/IMPLEMENTATION_PLAN.md` Phase 0.7.

- All vendor data modules live in `src/lib/vendors/*.ts`, one file per entity (mirroring
  `src/lib/spaces/*.ts`): `profiles.ts`, `skills.ts`, `eventNeeds.ts`, `proposals.ts`,
  `engagements.ts`, `messages.ts`, `notifications.ts`, `reviews.ts`, `eventPortfolio.ts`,
  `savedNeeds.ts`, `matching.ts`, `expiration.ts`, `publishing.ts`, `adminAudit.ts`,
  `portfolioLinks.ts`, `seed.ts`. Types live in `src/lib/types/vendors.ts`.
- Unlike venues/bookings, this layer is unit-tested (`src/lib/vendors/__tests__/*`) — the
  vitest config runs in `environment: "node"` (no `window`), so every localStorage-backed
  function has its pure business-rule core (skill/location matching, bid-expiration
  lapsing, one-active-bid-per-need, over-acceptance guard, review eligibility,
  average-rating math, notification de-dup, public-portfolio filtering) extracted into a
  plain function that takes its inputs as arguments instead of reading storage itself, so
  it can be tested without a browser. Follow this split for new vendor-layer logic instead
  of writing untested storage-coupled functions.
- **No events table exists in this prototype** (see `docs/DATABASE.md`) — a confirmed venue
  `Booking` (`src/lib/spaces/bookings.ts`) is the anchor for an organizer's vendor
  requests. `EventNeed.bookingId` points at a `Booking`, not a separate `Event` row.
  Organizer vendor-request UI lives at
  `/dashboard/organizer/bookings/[bookingId]/vendors`, not `/organizer/events/...`.
- **Vendor profile approval is real** (not the venue auto-publish exception) — see rule #8
  above.
- **No real email is ever sent.** The "email notifications" toggle in vendor onboarding is
  stored as a preference only (`VendorNotificationPreferences.emailEnabled`); nothing in
  this codebase calls an email provider. Don't add Resend or any other transactional-email
  dependency for this layer — there's no server to send from, and it would be dead code.
  If real email delivery is needed, it belongs in the real Phase 2 backend, not here.
- **Competitive bid privacy is client-side only, like everything else in this layer.**
  `computeCompetitiveBidSummary()` (`src/lib/vendors/matching.ts`) is written so it
  physically cannot return vendor-identifying fields (it takes only
  `{proposedAmount, pricingModel, status}[]` as input), but a technically sophisticated
  user could still read `localStorage` directly and see other vendors' full proposal
  records — the same limitation the whole prototype already has for venues/bookings, not a
  new risk introduced here. Real RLS-backed proposal privacy is a Phase 5 requirement, not
  optional polish.
- Message threads (`src/lib/vendors/messages.ts`) are anchored to a proposal
  (`proposalId`/`eventNeedId`), not an engagement — `engagementId` starts `null` and is
  upgraded in place once that proposal is finalized, never duplicated into a second
  thread. A thread can only be created via `getOrCreateThreadForProposal()`, called from
  exactly two places in `engagements.ts`: `startConversation()` (the organizer's
  pre-commitment "let's talk" action — moves the proposal to `in_discussion`, doesn't
  touch competing proposals, doesn't create an engagement) and `acceptProposal()` (reuses
  an existing thread, or creates one if the organizer finalized without ever starting a
  conversation). A vendor can never create a thread. Don't add a third code path that
  creates one — see `docs/SECURITY.md`'s "Chat unlock timing" for the full rule.
- Dev-only fictional seed data lives in `src/lib/vendors/seed.ts`, triggered manually from
  `/dev/seed-vendors` (a page that 404s when `NODE_ENV === "production"`). It is never
  called automatically. Re-running it reuses existing seed accounts/profiles rather than
  duplicating them (matched by a fixed set of `demo-*@example.com` emails).

## Commands

```bash
npm run dev      # local dev server
npm run lint      # ESLint
npm run build     # production build
```
