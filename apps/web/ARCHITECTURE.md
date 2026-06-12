# Web App Architecture

The web app uses a feature-folder architecture. Route segments stay thin; domain logic and UI live in feature folders.

## Layout

```
src/
  app/                  # Route segments ONLY: page.tsx, layout.tsx, loading.tsx,
                        # error.tsx, not-found.tsx. Pages compose features — no
                        # business logic, no presentational JSX beyond composition.
  features/             # One folder per domain feature. Each owns its
    alerts/             #   components/  client+server components for the feature
    cases/              #   hooks/       feature-specific React hooks
    vessels/            #   actions/     server actions for the feature
    analytics/
    audit/
    map/                #   layers/      mapbox layer definitions (map only)
    assistant/
    dashboard/          # shell, nav, stats — the dashboard frame itself
    onboarding/         # first-login guided tour
    landing/            # public landing page sections
  components/
    ui/                 # shadcn primitives. Generic, no domain knowledge.
    shared/             # cross-feature presentational pieces (severity-chip,
                        # status-badge, data-row, echart wrapper).
  lib/                  # api client, utils, app-wide constants.
```

## Import rules (lint-enforced)

1. `app/` may import from `features/`, `components/`, and `lib/`.
2. `features/` may import from `components/` and `lib/` — **never** from `app/`.
3. Features may **not** import from sibling features. Anything two features need
   belongs in `components/shared/` (presentational) or `lib/` (logic/constants).

## Client/server boundary

Page files remain server components. `"use client"` belongs at the leaf component
level inside features. Client components must import constants from
`@siren/shared/constants` (zod-free); zod schemas are server-only.

## Bundle discipline

Heavy modules (mapbox-gl, echarts, supabase-js, the onboarding tour) load via
`next/dynamic` / dynamic `import()` so they stay out of first-load JS. Before
adding a top-level import >20KB gzipped to a client component, check the build
route table.
