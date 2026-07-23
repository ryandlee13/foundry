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
| `/spaces/[slug]` | Venue detail — booking is functional against the local-prototype `bookings` store (instant confirm, no quote step) |
| `/list-your-venue` | Real (prototype) venue submission form — gated on being signed in, publishes immediately with no admin review (scoped exception, see `docs/SECURITY.md` #9) |
| `/about` | "Coming soon" placeholder |
| `/vendors` | "Coming soon" placeholder for the vendor marketplace (nav: "For Vendors") |
| `/vendors/[id]` *(future)* | Public vendor detail — approved profiles only, once the real directory lands here |

### `/spaces` — Discover Spaces

Built ahead of Phase 3's real venue directory as a UI-only prototype: filtering,
sorting, and the location/radius picker all run client-side against local dummy data in
`src/lib/spaces/venues.ts` (see `docs/IMPLEMENTATION_PLAN.md`). No table backs this route
yet and no network calls are made. When Phase 3 lands, `venues`/`venue_photos`/etc. will
need additional columns (space type, amenities, rules) to back this UI with real data —
`docs/DATABASE.md` does not yet reflect those fields. Distances and locations use
neighborhood-level coordinates only, consistent with the `exact_address` rule in
`docs/SECURITY.md`.

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
| `/dashboard/organizer` | `organizer` | Organizer home: events, booking requests, vendor needs, proposals |
| `/dashboard/organizer/events/new` *(future)* | `organizer` | Create event brief |
| `/dashboard/organizer/events/[id]` *(future)* | `organizer` | Manage one event end-to-end |
| `/dashboard/venue` | `venue_operator` | Venue operator home: listings, incoming booking requests, quotes |
| `/dashboard/venue/listings/new` *(future)* | `venue_operator` | Submit a new venue listing |
| `/dashboard/venue/listings/[id]` *(future)* | `venue_operator` | Manage one venue listing |
| `/dashboard/vendor` | `vendor` | Vendor home: profile status, open needs matching category, active proposals |
| `/dashboard/vendor/profile` *(future)* | `vendor` | Manage vendor profile and services |
| `/dashboard/admin` | `admin` | Admin home: pending venue/vendor approvals, document review queue, audit log |
| `/dashboard/admin/venues` *(future)* | `admin` | Venue approval queue |
| `/dashboard/admin/vendors` *(future)* | `admin` | Vendor approval queue |

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
