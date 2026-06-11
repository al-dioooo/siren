// Embeddings Gemini untuk RAG (plan 05 Module 3.2 / DEPENDENCIES.md §8).
// gemini-embedding-001, outputDimensionality 1536 (match kolom vector(1536) + HNSW).
// Null-safe: gagal embed tidak boleh menggagalkan penyimpanan citation.
import { embed } from 'ai';
import { MODEL_EMBED, aiProvider, countLlmCall } from '../lib/ai';
import { prisma } from '../lib/prisma';

const EMBEDDING_DIM = 1536;

export async function embedText(text: string): Promise<number[]> {
  countLlmCall(MODEL_EMBED);
  const { embedding } = await embed({
    model: aiProvider.textEmbedding(MODEL_EMBED),
    value: text,
    providerOptions: { google: { outputDimensionality: EMBEDDING_DIM } },
  });
  if (embedding.length !== EMBEDDING_DIM) {
    throw new Error(`Dimensi embedding ${embedding.length} ≠ ${EMBEDDING_DIM}`);
  }
  return embedding;
}

/** Isi kolom embedding sebuah citation; gagal → warning, citation tetap utuh */
export async function embedCitation(lawRef: string): Promise<boolean> {
  const row = await prisma.pasalCitation.findUnique({ where: { lawRef } });
  if (!row) return false;
  try {
    const vector = await embedText(`${row.title}\n${row.body}`);
    await prisma.$executeRaw`
      UPDATE "PasalCitation" SET embedding = ${`[${vector.join(',')}]`}::vector WHERE law_ref = ${lawRef}
    `;
    return true;
  } catch (e) {
    console.warn(`[embedding] gagal embed ${lawRef}: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

/** Retry semua citation yang embedding-nya masih NULL */
export async function embedMissingCitations(): Promise<{ embedded: number; failed: number }> {
  const rows = await prisma.$queryRaw<Array<{ lawRef: string }>>`
    SELECT law_ref AS "lawRef" FROM "PasalCitation" WHERE embedding IS NULL
  `;
  let embedded = 0;
  let failed = 0;
  for (const { lawRef } of rows) {
    (await embedCitation(lawRef)) ? embedded++ : failed++;
  }
  return { embedded, failed };
}
