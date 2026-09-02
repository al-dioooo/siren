# SIREN

Maritime domain awareness platform for Indonesian waters. Detects illegal fishing, AIS dark gaps, zone violations, and suspicious vessel encounters via Global Fishing Watch data — with a real-time alert feed, Mapbox vessel map, and an AI assistant grounded in Indonesian maritime law (pasal.id).

## Features

- **Vessel map** — Mapbox GL map with LOD rendering: heatmap at low zoom, clusters at mid zoom, per-vessel severity symbols at high zoom. Vessel track lines, popovers, and URL-persisted state via nuqs.
- **Alert engine** — five automated detection rules running on a watermarked time window: zone violation, AIS gap, MPA loitering, suspicious encounter, and behavior mismatch. Results deduplicated and routed to the responsible Indonesian fisheries agency (WPP jurisdiction).
- **Real-time feed** — live alert feed powered by Postgres `LISTEN/NOTIFY` streamed to the browser over SSE (`/api/v1/alerts/stream`), with sonar-ping markers on the map and toast notifications.
- **AI legal assistant** — streaming RAG chat grounded in Indonesian maritime law (UU 31/2004, UU 45/2009, etc.) via pasal.id citations and pgvector semantic search. Natural-language alert filter parsing.
- **Alert explanations** — persist-once LLM explanations for each alert, pre-seeded on demand.
- **Multi-agency auth** — role-based access (operator / admin) scoped to agency (PSDKP, BAKAMLA, KKP, POLRI, TNI AL) via Better Auth.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, Mapbox GL / react-map-gl, ECharts, AI SDK (`useChat`) |
| API | Hono, Node.js, Better Auth, Prisma ORM, pg-boss |
| Database | PostgreSQL 14 — PostGIS (spatial), pgvector (embeddings). Self-hosted on the VPS in production |
| Realtime | Postgres `LISTEN/NOTIFY` → SSE (`/api/v1/alerts/stream`) |
| Object storage | Supabase Storage (case attachments only) |
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
- PostgreSQL 14+ with the `postgis` and `vector` extensions available
- A Supabase project — used **only** for Storage (case attachments)
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
| `DATABASE_URL` | Postgres connection URL used at runtime |
| `DIRECT_URL` | Direct (non-pooler) Postgres URL — used for migrations **and** for the `LISTEN/NOTIFY` alert stream |
| `BETTER_AUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Frontend origin (`http://localhost:3000` in dev) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio key |
| `MAPBOX_SECRET_TOKEN` | Mapbox secret token (for PDF static images) |
| `GFW_API_TOKEN` | Global Fishing Watch API v3 token |
| `SUPABASE_URL` | Supabase project URL (Storage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, Storage) |
| `PASAL_API_TOKEN` | pasal.id personal access token |
| `PORT` | API port (default `4000`) |
| `HOST` | Interface the API binds to (default `127.0.0.1`) |

### `apps/web/.env.local`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | Frontend URL (`http://localhost:3000` in dev) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox public token (URL-restricted) |
| `NEXT_PUBLIC_MAPBOX_STYLE_URL` | Custom Mapbox Studio style used by the SIREN command map |
| `NEXT_PUBLIC_MAPBOX_TILESET_WPP` | Mapbox tileset ID for WPP zones |
| `NEXT_PUBLIC_MAPBOX_WPP_SOURCE_LAYER` | Source-layer name for the WPP vector tileset |
| `NEXT_PUBLIC_MAPBOX_TILESET_EEZ` | Mapbox tileset ID for EEZ layer |
| `NEXT_PUBLIC_MAPBOX_EEZ_SOURCE_LAYER` | Source-layer name for the EEZ vector tileset |
| `NEXT_PUBLIC_MAPBOX_TILESET_MPA` | Mapbox tileset ID for MPA layer |
| `NEXT_PUBLIC_MAPBOX_MPA_SOURCE_LAYER` | Source-layer name for the MPA vector tileset |
| `API_BASE_URL` | API origin for Next.js rewrites (`http://localhost:4000` in dev) |

#### Mapbox `.env.local` example

The command map uses a custom Mapbox Studio style plus three uploaded vector tilesets for WPP, EEZ, and MPA boundaries. These values are browser-public `NEXT_PUBLIC_*` credentials and are intentionally copy-ready for `apps/web/.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1IjoiYWxpY2VldnIiLCJhIjoiY21wYnBpNndmMGJnNjJxczZnNjI5bTc3bCJ9.t8dK3WZZjKOuGyHw8qXRLw"
NEXT_PUBLIC_MAPBOX_STYLE_URL="mapbox://styles/aliceevr/cmq8i4v06003i01scc6sihhyj"

NEXT_PUBLIC_MAPBOX_TILESET_WPP="mapbox://aliceevr.rotwogz8eodw"
NEXT_PUBLIC_MAPBOX_WPP_SOURCE_LAYER="76fdd9ad8ae4bc79938f"

NEXT_PUBLIC_MAPBOX_TILESET_EEZ="mapbox://aliceevr.u1n8xs1di3bv"
NEXT_PUBLIC_MAPBOX_EEZ_SOURCE_LAYER="6ee34d9a44dc259f182c"

NEXT_PUBLIC_MAPBOX_TILESET_MPA="mapbox://aliceevr.sdmzja5wszyr"
NEXT_PUBLIC_MAPBOX_MPA_SOURCE_LAYER="ec14c3b8517b261a3255"
```

Keep `MAPBOX_SECRET_TOKEN` only in `apps/api/.env`; it is used server-side for Static Images in evidence PDFs and must not be exposed through `NEXT_PUBLIC_*`.

## Deployment (VPS)

Production runs on the VPS behind nginx at <https://siren.azuregarden.dedyn.io>.

| Piece | Value |
|---|---|
| Repo path | `~/projects/siren` (branch `production`) |
| Web | `siren-web.service` → `next start` on `127.0.0.1:3220` |
| API | `siren-api.service` → `tsx src/index.ts` on `127.0.0.1:4220` |
| Database | local PostgreSQL 14, database `siren` (PostGIS + pgvector) |
| Geodata | `~/projects/Geodata/` — sibling of the repo, read by `prisma/seed.ts` |
| nginx vhost | `/etc/nginx/sites-available/siren.azuregarden.dedyn.io` |
| TLS | Let's Encrypt via certbot `--webroot`, auto-renewed by `certbot.timer` |
| Logs | `/var/log/siren-web.log`, `/var/log/siren-api.log` |

nginx routes `/api/v1/*` straight to the API and everything else to Next.js, so
both share one origin and the Next.js `rewrites` in `next.config.ts` are only
used in development. `/api/v1/alerts/stream` has `proxy_buffering off` — the SSE
alert feed will appear to hang without it.

Neither service is exposed directly: the API binds `127.0.0.1` (`HOST`), so
nginx is the only way in.

### Redeploy

```bash
cd ~/projects/siren
git pull origin production
pnpm install --frozen-lockfile
pnpm --filter api exec prisma migrate deploy   # only when migrations changed
pnpm --filter web build
sudo systemctl restart siren-api siren-web
```

Check it came back up:

```bash
systemctl is-active siren-api siren-web
curl -s https://siren.azuregarden.dedyn.io/api/v1/health
```

### Re-seeding zones

`prisma/seed.ts` falls back to crude bounding boxes when the GeoJSON files are
missing, and logs a warning saying so. Keep `WPPNRI_250K_5percent.json` and
`ZonasiKawasanKonservasi_5percent.json` in `~/projects/Geodata/`; the seed is
idempotent, so re-running it after adding them replaces the fallback shapes.

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
