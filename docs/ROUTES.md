# Route Structure

Routes below marked **Public**, **Auth-only**, or **Role-gated** describe the intended
authorization for each route once auth is implemented. This session builds the pages as
placeholders; the guards described here land in the auth-implementation phase
(`docs/IMPLEMENTATION_PLAN.md`, Phase 2).

## Public routes

| Route | Purpose |
|---|---|
| `/` | Landing page — value proposition for all three audiences, CTA into sign-up |
| `/sign-in` | Sign-in placeholder |
| `/sign-up` | Sign-up placeholder (role selection happens post-signup, not at signup) |
| `/venues` *(future)* | Public venue directory — approved listings only, no exact address |
| `/venues/[id]` *(future)* | Public venue detail — approved listings only, no exact address |
| `/vendors` *(future)* | Public vendor directory — approved profiles only |
| `/vendors/[id]` *(future)* | Public vendor detail — approved profiles only |

## Auth-only routes (any authenticated user, regardless of role)

| Route | Purpose |
|---|---|
| `/dashboard` | Role-aware entry point. Server-side reads the user's `profile_roles` and either shows a combined view or redirects to the single-role dashboard. If the user has no roles yet, prompts role selection (future phase). |

## Role-gated routes

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
