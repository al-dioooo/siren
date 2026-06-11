// Seed dasar — idempotent (aman dijalankan berulang). Plan 01 Stage 4.
// Jalankan: pnpm --filter api db:seed
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { AGENCY_CODES } from '@siren/shared';
import { auth } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';
import { bboxToGeoJsonPolygon, MPA_FALLBACK, WPP_FALLBACK } from './data/fallback-zones';

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'siren-demo-2026';

const AGENCY_NAMES: Record<string, string> = {
  PSDKP: 'Pengawasan Sumber Daya Kelautan dan Perikanan',
  BAKAMLA: 'Badan Keamanan Laut',
  KKP: 'Kementerian Kelautan dan Perikanan',
  POLRI: 'Kepolisian Perairan',
  TNI_AL: 'Tentara Nasional Indonesia Angkatan Laut',
};

async function seedAgencies() {
  for (const code of AGENCY_CODES) {
    await prisma.agency.upsert({
      where: { code },
      update: { name: AGENCY_NAMES[code]! },
      create: { id: `agency_${code.toLowerCase()}`, code, name: AGENCY_NAMES[code]! },
    });
  }
  console.log(`[seed] agencies: ${AGENCY_CODES.length}`);
}

type ZoneRow = { id: string; zoneId: string; name: string; geojson: object };

function loadZones(): { wpp: ZoneRow[]; usedFallback: boolean } {
  const geojsonPath = path.join(import.meta.dirname, 'data', 'wpp.geojson');
  if (existsSync(geojsonPath)) {
    const fc = JSON.parse(readFileSync(geojsonPath, 'utf8'));
    const wpp = fc.features.map((f: { properties: { zone_id: string; name: string }; geometry: object }) => ({
      id: `wpp_${f.properties.zone_id.replace('WPP-', '')}`,
      zoneId: f.properties.zone_id,
      name: f.properties.name,
      geojson: f.geometry,
    }));
    return { wpp, usedFallback: false };
  }
  return {
    wpp: WPP_FALLBACK.map((z) => ({
      id: `wpp_${z.zoneId.replace('WPP-', '')}`,
      zoneId: z.zoneId,
      name: z.name,
      geojson: bboxToGeoJsonPolygon(z.bbox),
    })),
    usedFallback: true,
  };
}

async function seedWpp() {
  const { wpp, usedFallback } = loadZones();
  if (usedFallback) {
    console.warn('[seed] ⚠️  wpp.geojson tidak ditemukan — pakai FALLBACK kotak kasar. Ganti sebelum demo!');
  }
  for (const z of wpp) {
    await prisma.$executeRaw`
      INSERT INTO "WppZone" (id, zone_id, name, geom)
      VALUES (${z.id}, ${z.zoneId}, ${z.name}, ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(z.geojson)})))
      ON CONFLICT (zone_id)
      DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
    `;
  }
  console.log(`[seed] wpp zones: ${wpp.length}${usedFallback ? ' (fallback)' : ''}`);
}

async function seedMpa() {
  for (const m of MPA_FALLBACK) {
    const geojson = JSON.stringify(bboxToGeoJsonPolygon(m.bbox));
    await prisma.$executeRaw`
      INSERT INTO "MarineProtectedArea" (id, name, geom)
      VALUES (${m.zoneId}, ${m.name}, ST_Multi(ST_GeomFromGeoJSON(${geojson})))
      ON CONFLICT (id)
      DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
    `;
  }
  console.log(`[seed] mpa: ${MPA_FALLBACK.length}`);
}

async function seedJurisdictionRules() {
  // priority ASC = dievaluasi lebih dulu (plan 01 P4.1.4)
  const rules = [
    { id: 'jr_foreign_bakamla', priority: 10, ruleType: null, vesselFlagScope: 'foreign', agencyCode: 'BAKAMLA' },
    { id: 'jr_domestic_psdkp', priority: 20, ruleType: null, vesselFlagScope: 'domestic', agencyCode: 'PSDKP' },
    { id: 'jr_fallback_psdkp', priority: 99, ruleType: null, vesselFlagScope: 'any', agencyCode: 'PSDKP' },
  ];
  for (const r of rules) {
    const agency = await prisma.agency.findUniqueOrThrow({ where: { code: r.agencyCode } });
    await prisma.jurisdictionRule.upsert({
      where: { id: r.id },
      update: { priority: r.priority, vesselFlagScope: r.vesselFlagScope, assignedAgencyId: agency.id, active: true },
      create: {
        id: r.id,
        priority: r.priority,
        ruleType: r.ruleType,
        vesselFlagScope: r.vesselFlagScope,
        assignedAgencyId: agency.id,
      },
    });
  }
  console.log(`[seed] jurisdiction rules: ${rules.length}`);
}

async function seedUser(email: string, name: string, role: string, agencyCode: string | null) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    // Lewat Better Auth supaya hash password konsisten dengan login
    await auth.api.signUpEmail({ body: { email, password: SEED_PASSWORD, name } });
  }
  const agency = agencyCode ? await prisma.agency.findUniqueOrThrow({ where: { code: agencyCode } }) : null;
  await prisma.user.update({
    where: { email },
    data: { role, agencyId: agency?.id ?? null, emailVerified: true },
  });
}

async function seedUsers() {
  await seedUser('admin@siren.id', 'Admin SIREN', 'admin', 'PSDKP');
  for (const code of AGENCY_CODES) {
    await seedUser(`operator.${code.toLowerCase()}@siren.id`, `Operator ${code}`, 'operator', code);
  }
  console.log(`[seed] users: ${1 + AGENCY_CODES.length} (password: $SEED_PASSWORD atau default)`);
}

async function main() {
  await seedAgencies();
  await seedWpp();
  await seedMpa();
  await seedJurisdictionRules();
  await seedUsers();
  console.log('[seed] selesai ✓');
}

main()
  .catch((e) => {
    console.error('[seed] GAGAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
