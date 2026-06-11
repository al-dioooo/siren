// Pre-seed korpus pasal + embeddings (plan 05 P3.1.3 + P3.2.1).
// Demo TIDAK boleh tergantung pasal.id live — semua lawRef ter-cache di Postgres.
// Pakai: pnpm --filter api exec tsx scripts/seed-pasal.ts
import '../src/lib/env';
import { RULE_LAW_REFS } from '@siren/shared';
import { prisma } from '../src/lib/prisma';
import { embedMissingCitations } from '../src/services/embedding.service';
import { getCitation, getPasalHttpCount } from '../src/services/pasal.service';

const allRefs = [...new Set(Object.values(RULE_LAW_REFS).flat())];
console.log(`[seed-pasal] ${allRefs.length} lawRef unik dari RULE_LAW_REFS`);

for (const ref of allRefs) {
  const citation = await getCitation(ref);
  const localFallback = citation.body.startsWith('[Kutipan]');
  console.log(`  ✓ ${ref} — ${citation.body.length} chars${localFallback ? ' (korpus lokal)' : ' (pasal.id)'}`);
}

console.log(`[seed-pasal] HTTP requests pasal.id: ${getPasalHttpCount()}`);

const { embedded, failed } = await embedMissingCitations();
console.log(`[seed-pasal] embeddings: ${embedded} terisi, ${failed} gagal`);

const [stats] = await prisma.$queryRaw<Array<{ total: bigint; withBody: bigint; withEmbedding: bigint }>>`
  SELECT count(*) AS total,
         count(*) FILTER (WHERE length(body) > 0) AS "withBody",
         count(*) FILTER (WHERE embedding IS NOT NULL) AS "withEmbedding"
  FROM "PasalCitation"
`;
console.log(
  `[seed-pasal] DB: total ${stats!.total}, body non-empty ${stats!.withBody}, embedded ${stats!.withEmbedding}`,
);
await prisma.$disconnect();
