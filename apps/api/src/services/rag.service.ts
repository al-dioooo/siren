// RAG retrieval atas korpus pasal (plan 06 P2.1.1).
// Embed query → pgvector cosine top-5 dengan HNSW (ef_search 40).
import { prisma } from '../lib/prisma';
import { embedText } from './embedding.service';

export type RagCitation = {
  lawRef: string;
  title: string;
  body: string;
  sourceUrl: string;
  similarity: number;
};

const TOP_K = 5;
const HNSW_EF_SEARCH = 40;

export async function searchCitations(query: string): Promise<RagCitation[]> {
  const vector = `[${(await embedText(query)).join(',')}]`;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${HNSW_EF_SEARCH}`);
    const rows = await tx.$queryRaw<RagCitation[]>`
      SELECT law_ref AS "lawRef", title, body, source_url AS "sourceUrl",
             1 - (embedding <=> ${vector}::vector) AS similarity
      FROM "PasalCitation"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vector}::vector
      LIMIT ${TOP_K}
    `;
    return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
  });
}
