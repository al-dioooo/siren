# SIREN

Maritime domain awareness platform for Indonesian waters. Detects illegal fishing, AIS dark gaps, zone violations, and suspicious vessel encounters via Global Fishing Watch data — with a real-time alert feed, Mapbox vessel map, and an AI assistant grounded in Indonesian maritime law (pasal.id).

## Features

- **Vessel map** — Mapbox GL map with LOD rendering: heatmap at low zoom, clusters at mid zoom, per-vessel severity symbols at high zoom. Vessel track lines, popovers, and URL-persisted state via nuqs.
- **Alert engine** — five automated detection rules running on a watermarked time window: zone violation, AIS gap, MPA loitering, suspicious encounter, and behavior mismatch. Results deduplicated and routed to the responsible Indonesian fisheries agency (WPP jurisdiction).
- **Real-time feed** — live alert feed powered by Supabase Realtime with sonar-ping markers on the map and toast notifications.
- **AI legal assistant** — streaming RAG chat grounded in Indonesian maritime law (UU 31/2004, UU 45/2009, etc.) via pasal.id citations and pgvector semantic search. Natural-language alert filter parsing.
- **Alert explanations** — persist-once LLM explanations for each alert, pre-seeded on demand.
- **Multi-agency auth** — role-based access (operator / admin) scoped to agency (PSDKP, BAKAMLA, KKP, POLRI, TNI AL) via Better Auth.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Mapbox GL / react-map-gl, ECharts, AI SDK (`useChat`) |
| API | Hono, Node.js, Better Auth, Prisma ORM, pg-boss |
| Database | PostgreSQL via Supabase — PostGIS (spatial), pgvector (embeddings) |
| AI | Google Gemini (`gemini-2.0-flash` chat, `gemini-embedding-001` 1536-dim vectors) |
| Data source | Global Fishing Watch API v3 |
| Law corpus | pasal.id API + local fallback corpus |
| Monorepo | pnpm workspaces (`pnpm@11.5.1`) |

## Repository Structure

```
siren/
├── apps/
│   ├── web/          # Next.js frontend (port 3000)
│   └── api/          # Hono API server (port 4000)
│       ├── prisma/   # Schema, migrations, seed
│       ├── src/
│       │   ├── rules/      # 5 alert detection rules
│       │   ├── services/   # Alert engine, GFW, RAG, jurisdiction, embedding
│       │   └── routes/     # /alerts, /map, /ai, /stats
│       └── scripts/  # import-gfw, seed-demo, run-alert-engine, pre-seed-explanations
└── packages/
    └── shared/       # Zod schemas, constants, and types shared across apps
```

## Prerequisites

- Node.js ≥ 20.9
- pnpm 11.5.1 — `npm install -g pnpm@11.5.1` or `corepack enable && corepack prepare pnpm@11.5.1 --activate`
- A Supabase project with the `pgvector` and `postgis` extensions enabled
- A Mapbox account (Education tier works)
- A Google AI Studio API key (free — [aistudio.google.com](https://aistudio.google.com))
- A Global Fishing Watch API token — [globalfishingwatch.org/our-apis](https://globalfishingwatch.org/our-apis/)
- A pasal.id personal access token — [pasal.id/akun](https://pasal.id/akun)

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd siren
pnpm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Fill in all values in both files (see Environment Variables below)

# 3. Run migrations
pnpm --filter api exec prisma migrate deploy

# 4. Seed the database
pnpm --filter api db:seed

# 5. Start development servers (web + api in parallel)
pnpm dev
```

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

Default seeded logins:

| Email | Password | Role |
|---|---|---|
| `admin@siren.id` | `password` | admin (PSDKP) |
| `operator.psdkp@siren.id` | `password` | operator (PSDKP) |
| `operator.bakamla@siren.id` | `password` | operator (BAKAMLA) |
| `operator.kkp@siren.id` | `password` | operator (KKP) |
| `operator.polri@siren.id` | `password` | operator (POLRI) |
| `operator.tni_al@siren.id` | `password` | operator (TNI AL) |

## Environment Variables

### `apps/api/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URL (port 5432, for migrations) |
| `BETTER_AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Frontend origin (`http://localhost:3000` in dev) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio key |
| `MAPBOX_SECRET_TOKEN` | Mapbox secret token (for PDF static images) |
| `GFW_API_TOKEN` | Global Fishing Watch API v3 token |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `PASAL_API_TOKEN` | pasal.id personal access token |
| `PORT` | API port (default `4000`) |

### `apps/web/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Frontend URL (`http://localhost:3000` in dev) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token (URL-restricted) |
| `NEXT_PUBLIC_MAPBOX_TILESET_WPP` | Mapbox tileset ID for WPP zones |
| `NEXT_PUBLIC_MAPBOX_TILESET_EEZ` | Mapbox tileset ID for EEZ layer |
| `NEXT_PUBLIC_MAPBOX_TILESET_MPA` | Mapbox tileset ID for MPA layer |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (for Realtime) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (for Realtime) |
| `API_BASE_URL` | API origin for Next.js rewrites (`http://localhost:4000` in dev) |

## Scripts

```bash
# Run only one app
pnpm dev:web
pnpm dev:api

# Type check + lint across all packages
pnpm -r lint

# Build all packages
pnpm build

# Database migrations
pnpm --filter api exec prisma migrate dev    # dev (generates migration)
pnpm --filter api exec prisma migrate deploy # production

# Import live vessel data from GFW (idempotent)
pnpm --filter api exec tsx scripts/import-gfw.ts --days 7

# Seed demo vessels, positions, alerts, and cases
pnpm --filter api exec tsx scripts/seed-demo.ts

# Run the alert engine manually
pnpm --filter api exec tsx scripts/run-alert-engine.ts

# Pre-seed LLM explanations for all alerts
pnpm --filter api exec tsx scripts/pre-seed-explanations.ts

# Smoke test — checks DB, Gemini, GFW, and Supabase Storage
pnpm --filter api smoke
```
