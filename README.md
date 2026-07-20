# Event Marketplace

A marketplace connecting event organizers, venue operators, and vendors (DJs,
photographers, caterers, security, and more) in San Francisco. See [`docs/PRD.md`](docs/PRD.md)
for the full product context.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Zod
· React Hook Form

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in real values from your Supabase project
(Project Settings → API):

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API → Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API → anon public key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API → service_role key | **Secret — server-only** |
| `NEXT_PUBLIC_APP_URL` | This app's base URL (`http://localhost:3000` locally) | Public |

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security and must never be exposed to the
browser, committed to source control, or referenced outside `src/lib/supabase/admin.ts`
and other server-only files. See [`docs/SECURITY.md`](docs/SECURITY.md).

No Supabase project is required to run this session's app shell — the placeholder pages
don't call Supabase yet. A project is needed starting with the database/auth phases in
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Lint and build

```bash
npm run lint
npm run build
```

## Project documentation

- [`docs/PRD.md`](docs/PRD.md) — problem, roles, user journeys, MVP scope
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack and system shape
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema proposal, ownership, RLS per table
- [`docs/ROUTES.md`](docs/ROUTES.md) — route structure and authorization
- [`docs/SECURITY.md`](docs/SECURITY.md) — mandatory security rules
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — phased build order
- [`CLAUDE.md`](CLAUDE.md) — guidance for AI coding agents working in this repo

## Deployment

Built to deploy on [Vercel](https://vercel.com). Set the same environment variables listed
above in the Vercel project's Environment Variables settings — never in a committed file.
