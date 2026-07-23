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

---

## Sequencing rules

1. No phase skips ahead of RLS. If Phase 3+ adds a new table, that table gets policies in
   the same PR that introduces it, not "later."
2. UI for a workflow step is not considered done until its server-side authorization and
   validation are also done — a pretty form backed by an unauthenticated action is not a
   deliverable.
3. Each phase should leave `npm run lint` and `npm run build` clean before moving to the
   next.
