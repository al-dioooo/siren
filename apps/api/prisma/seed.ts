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
type MpaRow = { id: string; name: string; geojson: object };

function loadZones(): { wpp: ZoneRow[]; usedFallback: boolean } {
  const geojsonPath = path.resolve(import.meta.dirname, '../../../../Geodata/WPPNRI_250K_5percent.json');
  if (existsSync(geojsonPath)) {
    const fc = JSON.parse(readFileSync(geojsonPath, 'utf8'));
    const wpp = fc.features.map((f: { properties: { ID_WPP: string; NAMOBJ: string }; geometry: object }) => ({
      id: `wpp_${f.properties.ID_WPP}`,
      zoneId: `WPP-${f.properties.ID_WPP}`,
      name: f.properties.NAMOBJ,
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

function loadMpas(): { mpas: MpaRow[]; usedFallback: boolean } {
  const geojsonPath = path.resolve(import.meta.dirname, '../../../../Geodata/ZonasiKawasanKonservasi_5percent.json');
  if (existsSync(geojsonPath)) {
    const fc = JSON.parse(readFileSync(geojsonPath, 'utf8'));
    const mpas = fc.features.map((f: { properties: { Id: number | string; NAMAOBJ?: string }; geometry: object }, index: number) => ({
      id: `mpa_${index}_${f.properties.Id}`,
      name: f.properties.NAMAOBJ?.trim() || `Kawasan Konservasi ${f.properties.Id}`,
      geojson: f.geometry,
    }));
    return { mpas, usedFallback: false };
  }

  return {
    mpas: MPA_FALLBACK.map((m) => ({
      id: m.zoneId,
      name: m.name,
      geojson: bboxToGeoJsonPolygon(m.bbox),
    })),
    usedFallback: true,
  };
}

async function seedWpp() {
  const { wpp, usedFallback } = loadZones();
  if (usedFallback) {
    console.warn('[seed] WPP GeoJSON tidak ditemukan — pakai FALLBACK kotak kasar. Ganti sebelum demo!');
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
  const { mpas, usedFallback } = loadMpas();
  if (usedFallback) {
    console.warn('[seed] MPA GeoJSON tidak ditemukan — pakai FALLBACK demo.');
  } else {
    await prisma.marineProtectedArea.deleteMany();
  }

  for (let i = 0; i < mpas.length; i += 250) {
    const chunk = mpas.slice(i, i + 250).map((m) => ({
      id: m.id,
      name: m.name,
      geojson: JSON.stringify(m.geojson),
    }));
    await prisma.$executeRawUnsafe(
      `
      WITH data AS (
        SELECT *
        FROM jsonb_to_recordset($1::jsonb) AS x(id text, name text, geojson text)
      )
      INSERT INTO "MarineProtectedArea" (id, name, geom)
      SELECT id, name, ST_Multi(ST_GeomFromGeoJSON(geojson))
      FROM data
      ON CONFLICT (id)
      DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
      `,
      JSON.stringify(chunk),
    );
  }
  console.log(`[seed] mpa: ${mpas.length}${usedFallback ? ' (fallback)' : ''}`);
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
