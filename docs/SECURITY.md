# Security Requirements

These rules are mandatory for every phase of this project, not just the MVP. Any change
that would violate one of these needs an explicit, documented exception — not a silent
workaround.

## 1. Service-role key isolation

- `SUPABASE_SERVICE_ROLE_KEY` is read only in server-only files (e.g.,
  `src/lib/supabase/admin.ts`), which import Next.js's `server-only` package so any
  accidental import from a client component fails the build instead of leaking the key.
- The key is never referenced in any file under a `"use client"` boundary, never sent in a
  response body, never logged.
- It is used only for: admin approval actions, generating short-lived signed URLs for
  private documents, and server-side cross-row transactions that must bypass RLS
  intentionally (with the authorization check done explicitly in code first).

## 2. Server-side authorization for protected actions

- Every mutation (create/update/delete) that matters happens through a Server Action or
  Route Handler that re-derives the current user server-side (`supabase.auth.getUser()`)
  and checks ownership/role **before** touching the database — never trusting a value
  passed from the client (e.g., a hidden `ownerId` field in a form).
- RLS is the backstop that makes this true even if a Server Action has a bug: a query run
  as the authenticated user cannot return or mutate rows RLS doesn't allow, full stop.
- Hidden buttons, disabled UI, or client-side route guards are UX only. They are never the
  sole gate on a sensitive action.

## 3. Row Level Security

- RLS is **enabled on every table listed in `docs/DATABASE.md`** before that table is
  used by any feature — a table is not shipped "temporarily open."
- Policies are written per-operation (`select`, `insert`, `update`, `delete`), not a single
  catch-all `using (true)`.
- Ownership comparisons use `auth.uid()` against a column on the row directly wherever
  possible. Where authorization depends on a relationship one hop away (e.g., message
  thread participancy), a `security definer` helper function encapsulates that check so
  policies stay auditable.
- New tables added later follow the same pattern; "add the table first, RLS later" is not
  an acceptable sequencing.

## 4. Ownership boundaries

- Users may only update records they own, or that they are the authorized counterparty on
  (e.g., a venue operator may update the `status` of a `booking_request` addressed to
  their venue, but not its `guest_count`, which the organizer owns).
- Every table's ownership model is documented per-table in `docs/DATABASE.md` §1–18; that
  document is the source of truth for "who can touch this row."

## 5. Public listing privacy

- `venues.exact_address` is never included in any query or API response reachable by an
  anonymous or non-counterparty user. Public venue browsing surfaces `approx_location`
  (neighborhood-level) only.
- The exact address is revealed only after a booking reaches a state where it's
  operationally necessary (post-confirmation), and even then only to the organizer and
  venue owner on that specific booking — resolved server-side, not shipped in a public API
  payload with a "just don't render it" client-side omission.

## 6. Private document storage

- Certificates of Insurance, IDs, contracts, permits, security plans, and any other
  sensitive upload go into a **private** Supabase Storage bucket (`documents`), distinct
  from the public bucket used for venue/vendor marketing photos.
- The private bucket has no public access policy at all — every read goes through a
  server-generated **short-lived signed URL** (minutes, not days), issued only after the
  requesting user passes the same ownership/counterparty check enforced by the `documents`
  table's RLS.
- Signed URLs are never cached long-term, embedded in emails without expiry consideration,
  or logged.

## 7. Document review language

- The product **never** states or implies a document has been legally verified. Allowed
  status language: `submitted`, `under review`, `reviewed`. Never: `verified`, `approved`
  (in a legal/compliance sense), `certified`, `confirmed valid`.
- This applies to UI copy, status enum values (`docs/DATABASE.md` §11), notification text,
  and any future admin tooling.

## 8. Input validation

- All server-side entry points (Server Actions, Route Handlers) validate their input with
  a Zod schema before doing anything else with it — including data that also has a
  client-side form validator. Client-side Zod validation (via React Hook Form's resolver)
  is a UX improvement, never a substitute for server-side validation, since a client can
  always be bypassed.
- Validation schemas live under `src/lib/validation/` and are shared between the client
  form and the server action where practical, so the two never silently drift apart.

## 9. Admin approval gate

- `venues` and `vendor_profiles` are only publicly visible when `status = 'approved'`.
  There is no code path that renders a `pending_review` or `draft` listing on a public
  page, even briefly, even for "preview."
- Approval/rejection is an admin-only server-side action, gated by the `admin` role in
  `profile_roles`, and recorded in `admin_audit_logs`.
- **Scoped, temporary exception (venues and vendor profiles):** the browser-local
  venue-submission prototype (`src/components/spaces/VenueSubmissionForm.tsx`, see
  `CLAUDE.md` → "Local-prototype layer") publishes immediately with no review step, since
  there's no real `venues` table or admin action to gate against yet. As of the vendor
  deal-finalization rework, vendor profile submission does the same:
  `publishVendorProfile()` (`src/lib/vendors/profiles.ts`) sets `status: "published"`
  immediately in place of the earlier `submitVendorProfileForReview()` →
  `pending_review` step. Neither of these applies once the real database and admin flow
  exist — this rule is still non-negotiable for the real product, and both prototype
  exceptions need a real pre-publish gate before any real launch.
- **Admin moderation still exists for vendor profiles, just not as a pre-publish gate.**
  `approveVendorProfile()`/`rejectVendorProfile()`/`suspendVendorProfile()`, callable only
  from the admin dashboard (`/dashboard/admin`, gated on `user.roles.includes("admin")`),
  can still move a profile out of public visibility after the fact.
  `VendorProfileLookup` re-checks `status === "published"` before rendering, so a
  suspended/rejected profile still can't be reached publicly even though nothing blocked
  it from *reaching* `published` in the first place. There is currently no self-serve way
  for a user to grant themselves the `admin` role (by design — see `docs/DATABASE.md`
  §2) — a dev tester needs to add it manually (e.g. via browser devtools against
  `foundry.auth.accounts` in `localStorage`), same limitation `docs/DATABASE.md` already
  notes for the real `admin` role.

## 10. Secrets hygiene

- No secret, real API key, or production credential is ever committed to source control.
- `.env.example` documents variable **names** only, with placeholder values.
- Real values live in `.env.local` (git-ignored) locally and in Vercel's environment
  variable settings in deployed environments.
- If a secret is ever accidentally committed, the fix is rotation, not just deletion from
  the latest commit (git history retains it).

## Threat model notes specific to this marketplace

- **Cross-role data leakage**: because one account can hold multiple roles, authorization
  checks must key off the specific role required for the specific action being performed,
  never "the user is logged in and has *a* role."
- **Address scraping**: public venue pages are a plausible scraping target for exact
  addresses; keeping `exact_address` out of the payload entirely (not just hidden in the
  UI) is the mitigation, not obfuscation.
- **Document exposure via URL sharing**: signed URLs are short-lived specifically so a
  forwarded link (e.g., pasted into an unrelated chat) stops working quickly rather than
  becoming a permanent leak.

## Vendor marketplace notes (see also `CLAUDE.md` and `docs/DATABASE.md`)

- **Competitive bid privacy**: an organizer's event need may receive proposals from
  multiple vendors, but a vendor must never see another vendor's identity, portfolio,
  message, or exact competing offer — only an anonymized summary (lowest/highest/median
  active bid, pricing models represented) after they've submitted their own bid. In the
  real implementation this must be enforced by RLS or a security-definer view/RPC, never a
  query the client could simply broaden. The prototype's `computeCompetitiveBidSummary()`
  (`src/lib/vendors/matching.ts`) takes only `{proposedAmount, pricingModel, status}` as
  input specifically so it cannot leak more even if misused — port that same
  narrow-input-shape discipline into the real RPC.
- **Chat unlock timing (proposal threads)**: a message thread between an organizer and a
  vendor must not be creatable, and therefore not accessible, by anyone other than the
  organizer who owns the parent event need — and only for a proposal on that need. This is
  not just a UI-hidden route — the real implementation needs this enforced at the data
  layer (thread row simply doesn't exist for anyone else to read, and RLS denies
  reads/writes to non-participants regardless). Unlike an earlier version of this rule, a
  thread does **not** require the proposal to be accepted first — the product supports a
  pre-commitment "Start Conversation" step (the organizer opts into messaging a specific
  vendor while the proposal is still just `submitted`/`shortlisted`, moving it to
  `in_discussion`; other proposals on the need stay untouched and no `vendor_engagements`
  row exists yet). What's still true, and still the security-relevant invariant: **a
  vendor can never create a thread**, only an organizer can (via `startConversation()` or
  `finalizeDeal()` in `src/lib/vendors/engagements.ts` — `finalizeDeal()` replaced the
  earlier `acceptProposal()`, but the invariant is unchanged — both funnel through the
  same `getOrCreateThreadForProposal()` in `src/lib/vendors/messages.ts`), and a thread is
  idempotent per proposal — finalizing later upgrades the same thread's `engagement_id` in
  place rather than creating a second one. RLS-equivalent gating on every read is still
  `isThreadParticipant()`. Note that finalizing no longer unilaterally confirms the deal —
  `finalizeDeal()` only sends terms; the engagement sits in `pending_vendor_confirmation`
  until the vendor separately calls `confirmEngagementTerms()`, at which point the
  competing-proposal-closing sweep runs (deliberately not at finalize time — see
  `CLAUDE.md`).
- **Chat unlock timing (booking threads)**: the same invariant, mirrored for venue
  bookings — a thread between an organizer and a venue owner over a confirmed booking must
  not be creatable by anyone but the venue owner on that specific booking. This is enforced
  by `startBookingConversation(bookingId, actorAccountId)` in
  `src/lib/spaces/bookingWorkflow.ts`, which throws unless the actor owns the venue and the
  booking is `confirmed`. An organizer/planner can never create a booking thread — they can
  only reply once the venue owner has created one. `MessageThread` is now a discriminated
  union (`ProposalMessageThread | BookingMessageThread` in
  `src/lib/vendors/messages.ts`); `isThreadParticipant()` still gates every read
  regardless of kind, and `normalizeStoredThread()` must keep backfilling `kind` onto any
  thread persisted before this union existed so old local data doesn't silently fail to
  narrow to either branch.
- **Exact venue address stays private through the vendor flow too**: `EventNeed`'s
  `public_location` is the venue's neighborhood, resolved server-side (or, in the
  prototype, at need-creation time from the venue record) — never the booking's/venue's
  `exact_address`. A vendor only ever sees the exact address after being accepted onto the
  engagement (and even then, only implicitly via the venue's own detail page if they're
  also the organizer's counterparty — no new address-exposure surface is introduced by
  this feature).
- **Review authenticity**: a vendor review may only be created by the organizer on a
  `completed` engagement, exactly once, and can never be edited after posting (only
  responded to, once, by the vendor). This prevents both fabricated reviews and after-the-
  fact tampering. Do not add a fake-review generator for vendors — see `CLAUDE.md`'s note
  on this.
- **Vendor service address privacy**: a non-remote-only vendor's `VendorLocation
  .serviceAddress` (§5's `exact_address` rule, extended to vendors) is never rendered on
  any public vendor page or included in a public API payload — it exists only to compute
  the service-radius match in `matchesLocation()` and to display in the vendor's own
  onboarding form. Only the resolved `homeCity`/neighborhood-level location is public,
  same pattern as venue `exact_address` → `approx_location`.
- **Agreed-terms wording is not a legal-enforceability claim**: once an organizer and
  vendor both confirm engagement terms (`finalizeDeal()` → `confirmEngagementTerms()`),
  the product describes this as a firm mutual commitment on Foundry — never as a legally
  binding contract, never implying court enforceability. This extends §7's "never claim
  legal verification" principle from document status language to deal-terms language.
  `formatAgreedTermsFootnote()` (`src/lib/vendors/agreedTerms.ts`) carries a `TODO(legal)`
  marker: real contract language needs counsel review before this ships to a real launch.
