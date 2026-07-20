# Architecture

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (single account, multi-role via `profile_roles`) |
| Database | Supabase Postgres, RLS-first |
| File storage | Supabase Storage (public bucket for venue/vendor marketing photos, private bucket for documents) |
| Validation | Zod, shared between client forms and server actions |
| Forms | React Hook Form + `@hookform/resolvers` (Zod resolver) |
| Hosting | Vercel-compatible |

## High-level shape

```
Browser (client components)
   │  anon key only
   ▼
Next.js App Router
   ├─ Server Components   → read data with the user's session (RLS enforced)
   ├─ Server Actions/Route Handlers → validate (Zod) → authorize → mutate
   └─ Admin-only server code → may use the service-role key (server-only, never bundled)
   │
   ▼
Supabase (Postgres + RLS, Auth, Storage)
```

Two Supabase clients exist by design (see `src/lib/supabase/`):

- **Browser client** (`client.ts`) — created with the **anon key** only. Used in client
  components for session-aware reads that RLS already permits (e.g., "my bookings").
- **Server client** (`server.ts`) — created per-request with the anon key **plus** the
  user's cookies, so RLS still applies as that user. Used in Server Components, Server
  Actions, and Route Handlers for anything that touches the database on the server.
- **Service-role client** (`admin.ts`, server-only file) — uses `SUPABASE_SERVICE_ROLE_KEY`.
  Only imported from server-only code paths (admin approval actions, signed-URL
  generation, cross-row transactional writes like "accept quote → create booking"). Never
  imported by any file that ships to the browser. `import "server-only"` is used to make
  accidental client bundling a build error, not just a convention.

## Why this shape

- **RLS is the primary authorization layer**, not a backstop. Every table a user can reach
  has policies that would independently reject an unauthorized read/write even if a UI bug
  exposed a button it shouldn't have. Server Actions add a second layer (Zod validation +
  explicit business-rule checks) because RLS row-ownership isn't expressive enough for
  things like "you can only accept a quote if it hasn't expired."
- **The service-role key never reaches the browser.** It's read only inside files that are
  never imported by client components, and Next.js `server-only` package enforces this at
  build time rather than relying on developer discipline.
- **Cross-row transitions go through server-side functions**, not chained client writes.
  Example: accepting a quote must (a) mark the quote `accepted`, (b) mark the
  `booking_request` `accepted_by_organizer`, (c) create a `booking` row. Doing this as three
  separate client-triggered writes risks partial failure and race conditions; a single
  Server Action (or eventually a Postgres function called via RPC) does it atomically.
- **Public data is separated from private data at the schema/query level**, not just in the
  UI. Venue `exact_address` and document `storage_path`s are never included in a query a
  browser client is allowed to run directly — they're only resolved server-side after an
  authorization check, and files are served via short-lived signed URLs.

## Directory layout (current + planned)

```
src/
  app/
    page.tsx                    public landing page
    not-found.tsx                custom 404
    layout.tsx                   root layout (header/footer/providers)
    globals.css
    (auth)/                      route group: centered auth layout, no shared nav
      layout.tsx
      sign-in/page.tsx
      sign-up/page.tsx
    (dashboard)/                 route group: protected, shares dashboard layout
      dashboard/
        layout.tsx                 server-side auth guard + role-aware nav
        page.tsx                   role-aware overview -> /dashboard
        organizer/page.tsx         -> /dashboard/organizer
        venue/page.tsx             -> /dashboard/venue
        vendor/page.tsx            -> /dashboard/vendor
        admin/page.tsx             -> /dashboard/admin
  components/
    layout/                      Header, Footer, shell chrome
    ui/                          LoadingState, EmptyState, SuccessState, ErrorState, etc.
  lib/
    supabase/
      client.ts                  browser client (anon key)
      server.ts                  server client (per-request, cookies)
      admin.ts                   service-role client (server-only)
    validation/                  Zod schemas (added as features land)
    types/                       shared TypeScript types
docs/                            this documentation set
```

Route groups (`(auth)`, `(dashboard)`) give the auth pages and the dashboard each their own
layout without affecting the URL — `(dashboard)/dashboard/organizer/page.tsx` still resolves
to `/dashboard/organizer`, matching `docs/ROUTES.md`. A `(marketing)` group for additional
public pages (venue/vendor directories) can be introduced in the phase that adds them
(`docs/IMPLEMENTATION_PLAN.md`, Phase 3) rather than pre-built now.

## Authentication model (planned, not built this session)

- One Supabase Auth user = one `profiles` row, created via a trigger on `auth.users` insert.
- Roles are additive rows in `profile_roles`; the dashboard layout reads the current user's
  roles server-side and renders/redirects accordingly — it does not trust a client-side
  role flag.
- Every protected route re-checks auth **on the server** (layout or page-level
  `getUser()` call) — client-side redirects are a UX nicety, never the enforcement
  mechanism. See `docs/SECURITY.md`.

## What this session builds vs. defers

This session ships the shell: routing structure, layout, placeholder pages, Supabase client
utilities, and documentation. It does **not** wire up real authentication, database
migrations, or data fetching — those are the next phases in
`docs/IMPLEMENTATION_PLAN.md`.
