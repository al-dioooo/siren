// Kutipan pasal cache-first (plan 05 Module 3.1).
// Urutan: LRU panas → Postgres (PasalCitation) → pasal.id REST → dokumen induk
// (UU 45/2009 jo. UU 31/2004) → korpus lokal. HTTP hanya terjadi saat cache miss.
import { LRUCache } from 'lru-cache';
import { RULE_LAW_REFS, type RuleType } from '@siren/shared';
import { PASAL_CORPUS } from '../data/pasal-corpus';
import { prisma } from '../lib/prisma';

const PASAL_BASE_URL = 'https://pasal.id/api/v1';

export type Citation = {
  lawRef: string;
  title: string;
  body: string;
  sourceUrl: string;
};

/** Counter HTTP — dipakai test cache-first (plan 05 Test 3.1) */
let httpRequestCount = 0;
export function getPasalHttpCount() {
  return httpRequestCount;
}

// LRU panas di depan Postgres (max 200, TTL 24 jam — plan 05 P3.1.1)
const hotCache = new LRUCache<string, Citation>({ max: 200, ttl: 24 * 60 * 60 * 1000 });
// Cache respons law-detail per frbr_uri selama proses hidup (korpus kecil)
const lawDetailCache = new Map<string, PasalIdLaw>();

type PasalIdArticle = { number: string; content: string | null };
type PasalIdLaw = {
  work: { title: string; source_url?: string | null; frbr_uri: string };
  articles: PasalIdArticle[];
};

/** "UU 45/2009 Pasal 93" → { type:'uu', number:'45', year:'2009', pasal:'93' } */
function parseLawRef(lawRef: string) {
  const m = lawRef.match(/^(UU|PM)\s+([\w-]+)\/(\d{4})\s+Pasal\s+(\w+)$/i);
  if (!m) throw new Error(`Format lawRef tidak dikenal: "${lawRef}"`);
  const [, rawType, number, year, pasal] = m;
  const type = rawType!.toUpperCase();
  return {
    frbrUri:
      type === 'UU'
        ? `akn/id/act/uu/${year}/${number}`
        : `akn/id/act/permenhub/${year}/pm-${number}`,
    pasal: pasal!,
  };
}

async function fetchLaw(frbrUri: string): Promise<PasalIdLaw | null> {
  const cached = lawDetailCache.get(frbrUri);
  if (cached) return cached;
  const token = process.env.PASAL_API_TOKEN;
  if (!token) return null;

  httpRequestCount++;
  const res = await fetch(`${PASAL_BASE_URL}/laws/${frbrUri}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn(`[pasal] HTTP ${res.status} untuk ${frbrUri}`);
    return null;
  }
  const law = (await res.json()) as PasalIdLaw;
  lawDetailCache.set(frbrUri, law);
  return law;
}

function articleFromLaw(law: PasalIdLaw | null, pasal: string): { body: string; title: string; sourceUrl: string } | null {
  if (!law) return null;
  const article = law.articles.find((a) => a.number === pasal && a.content && a.content.length > 0);
  if (!article) return null;
  return {
    body: article.content!,
    title: `${law.work.title} — Pasal ${pasal}`,
    sourceUrl: law.work.source_url ?? `https://pasal.id/${law.work.frbr_uri}`,
  };
}

/** UU 45/2009 adalah amandemen UU 31/2004 — pasal yang tidak diubah ada di induk */
const PARENT_DOC: Record<string, string> = {
  'akn/id/act/uu/2009/45': 'akn/id/act/uu/2004/31',
};

async function resolveFromSources(lawRef: string): Promise<Citation> {
  const { frbrUri, pasal } = parseLawRef(lawRef);

  const primary = articleFromLaw(await fetchLaw(frbrUri), pasal);
  if (primary) return { lawRef, ...primary };

  const parentUri = PARENT_DOC[frbrUri];
  if (parentUri) {
    const parent = articleFromLaw(await fetchLaw(parentUri), pasal);
    if (parent) return { lawRef, ...parent };
  }

  const local = PASAL_CORPUS.find((c) => c.lawRef === lawRef);
  if (local) {
    console.warn(`[pasal] ${lawRef}: teks tidak tersedia di pasal.id — pakai korpus lokal`);
    return { lawRef: local.lawRef, title: local.title, body: local.body, sourceUrl: local.sourceUrl };
  }

  throw new Error(`Tidak ada sumber untuk ${lawRef} (pasal.id kosong, korpus lokal tidak punya)`);
}

export async function getCitation(lawRef: string): Promise<Citation> {
  const hot = hotCache.get(lawRef);
  if (hot) return hot;

  const row = await prisma.pasalCitation.findUnique({ where: { lawRef } });
  if (row && row.body.length > 0) {
    const cit = { lawRef: row.lawRef, title: row.title, body: row.body, sourceUrl: row.sourceUrl };
    hotCache.set(lawRef, cit);
    return cit;
  }

  const citation = await resolveFromSources(lawRef);
  await prisma.pasalCitation.upsert({
    where: { lawRef },
    create: {
      id: `pasal_${lawRef.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      lawRef,
      title: citation.title,
      body: citation.body,
      sourceUrl: citation.sourceUrl,
    },
    update: { title: citation.title, body: citation.body, sourceUrl: citation.sourceUrl },
  });
  hotCache.set(lawRef, citation);
  return citation;
}

export async function getCitationsForRule(ruleType: RuleType): Promise<Citation[]> {
  return Promise.all(RULE_LAW_REFS[ruleType].map((ref) => getCitation(ref)));
}

/** Untuk test: kosongkan cache panas (DB tetap) */
export function clearPasalHotCache() {
  hotCache.clear();
  lawDetailCache.clear();
}
