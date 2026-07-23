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
   pattern to anything else without the same explicit approval.
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
  (`src/components/marketing/RecapCarousel.tsx`) uses invented names/quotes as
  explicitly-approved dummy filler until real testimonials exist, using initials-only
  avatars rather than real photos. Don't extend this pattern elsewhere (e.g. the community
  slideshow deliberately avoids claiming past events were "hosted on Foundry") without the
  same explicit approval, and replace this content with real recaps before a real launch.

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
  only in the browser that created them.
- `src/lib/spaces/bookings.ts` — bookings are instantly confirmed (no quote/negotiation
  step), also `localStorage`-only.
- None of this is real. Before a real launch, all three need: a real Supabase project,
  the `docs/DATABASE.md` schema (extended with space type/amenities/rules columns —
  see `docs/ROUTES.md`), RLS policies per `docs/SECURITY.md`, real Supabase Auth, and
  Server Actions that re-validate everything server-side per rule #3 above. Do not treat
  this layer as a starting point to "harden" incrementally — it's a UX prototype to be
  replaced, not extended toward production.

## Commands

```bash
npm run dev      # local dev server
npm run lint      # ESLint
npm run build     # production build
```
