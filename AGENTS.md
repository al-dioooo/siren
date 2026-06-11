# AGENTS.md

## Project

SIREN is a pnpm monorepo:

- `apps/web` — Next.js frontend.
- `apps/api` — Hono API, Prisma, Better Auth, jobs, server-only integrations.
- `packages/shared` — shared Zod schemas, constants, and types.

## Local Rules

- Use `pnpm`.
- Keep Prisma and direct database access inside `apps/api`.
- Do not import Prisma or server-only secrets from `apps/web`.
- Never commit `.env`, `.env.local`, service-role keys, database passwords, or API tokens.
- Prefer focused changes that match `PLAN.md`, `DESIGN.md`, and `Feature Plans/*`.
- Run verification before commits when possible:
  - `pnpm -r lint`
  - `pnpm build`

## Commit Rules

Use Conventional Commits:

- `feat:` for user-facing features.
- `fix:` for bug fixes.
- `chore:` for tooling, setup, dependencies, or repository maintenance.
- `docs:` for documentation-only changes.
- `refactor:` for code restructuring without behavior change.
- `test:` for test-only changes.

Commit message format:

```text
type(scope): short summary

- Description line one
- Description line two
- Description line three
```

Description requirements:

- Use a compact bullet list.
- Do not separate bullet items with blank lines.
- Keep each bullet focused on a concrete change.
- Do not include secrets, tokens, passwords, or private URLs.
