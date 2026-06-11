# Manual SQL Reference

SQL di folder ini sekarang hanya referensi/debug. Migration resmi sudah ada di
`apps/api/prisma/migrations`:

```bash
# Dev database
pnpm --filter api exec prisma migrate dev

# Production/VPS
pnpm --filter api exec prisma migrate deploy
```

Urutan migration:

1. `20260610190000_init` — 17 tabel + `postgis`/`vector` extension.
2. `20260610191000_add_performance_indexes` — 11 index hot path.
3. `20260610192000_add_wpp_trigger` — trigger pre-compute `wpp_zone_id`.
4. `20260610193000_add_stats_matview` — materialized view analytics.

Verifikasi: `SELECT indexname FROM pg_indexes WHERE schemaname='public';`
harus memuat 11 index performa (lihat `Feature Plans/01-foundation-infra.md`
P3.2.1).
