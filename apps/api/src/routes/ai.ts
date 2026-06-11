// Endpoint AI (plan 06): explanation, chat RAG streaming, NL search parse.
import { Hono } from 'hono';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateObject,
  streamText,
} from 'ai';
import { z } from 'zod';
import { EMPTY_FILTER, searchFilterSchema, type SearchFilter } from '@siren/shared';
import { MODEL_CHAT, MODEL_SEARCH, aiProvider, countLlmCall } from '../lib/ai';
import { chatRateLimit } from '../lib/ratelimit';
import { requireAuth } from '../middleware/require-auth';
import { explainAlert } from '../services/explanation.service';
import { searchCitations } from '../services/rag.service';
import type { AppEnv } from '../types';

export const aiRoutes = new Hono<AppEnv>();

// ── Feature 7: Alert Explanation (plan 06 P1.2.4) ──
aiRoutes.get('/api/v1/alerts/:id/explanation', requireAuth, async (c) => {
  const result = await explainAlert(c.req.param('id'));
  if (!result) return c.json({ error: 'Alert tidak ditemukan' }, 404);
  return c.json(result);
});

// ── Feature 8: RAG Legal Assistant (plan 06 P2.1.2 + P2.1.3) ──
const chatBodySchema = z.object({
  messages: z.array(z.unknown()).min(1),
});

const CHAT_SYSTEM_PROMPT = `Kamu Asisten Hukum SIREN untuk operator pengawasan perikanan Indonesia (PSDKP, BAKAMLA, KKP, POLRI, TNI AL).
Aturan:
- SELALU jawab dalam Bahasa Indonesia yang lugas dan profesional.
- SELALU sebutkan rujukan pasal (lawRef) dari konteks yang diberikan saat menjawab pertanyaan hukum, mis. "menurut UU 45/2009 Pasal 93".
- Jawab HANYA topik maritim, perikanan, dan hukum laut Indonesia. Pertanyaan di luar itu ditolak dengan halus dan arahkan kembali ke topik maritim.
- Kalau konteks pasal tidak memuat jawaban, katakan terus terang dan sarankan rujukan resmi.
- Jangan mengarang nomor pasal yang tidak ada di konteks.`;

aiRoutes.post('/api/v1/chat', requireAuth, chatRateLimit, async (c) => {
  const parsed = chatBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);

  const messages = parsed.data.messages as Parameters<typeof convertToModelMessages>[0];
  const lastUser = [...messages].reverse().find((m) => (m as { role?: string }).role === 'user');
  const lastText = lastUser
    ? ((lastUser as { parts?: Array<{ type: string; text?: string }> }).parts ?? [])
        .filter((p) => p.type === 'text')
        .map((p) => p.text ?? '')
        .join(' ')
    : '';

  const citations = lastText ? await searchCitations(lastText) : [];
  const context = citations
    .map((ct) => `[${ct.lawRef}] ${ct.title}\n${ct.body}\nSumber: ${ct.sourceUrl}`)
    .join('\n\n');

  countLlmCall(MODEL_CHAT);
  const modelMessages = await convertToModelMessages(messages);

  // Citations dikirim sebagai data part supaya UI bisa merender citation cards
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({
        type: 'data-citations',
        id: 'citations',
        data: citations.map((ct) => ({ ...ct, body: ct.body.slice(0, 600) })),
      });
      const result = streamText({
        model: aiProvider(MODEL_CHAT),
        system: `${CHAT_SYSTEM_PROMPT}\n\nKONTEKS PASAL:\n${context || '(kosong)'}`,
        messages: modelMessages,
      });
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
});

// ── Feature 9: NL Search Router (plan 06 P3.1.2) ──
const parseBodySchema = z.object({ query: z.string().min(1).max(300) });

aiRoutes.post('/api/v1/search/parse', requireAuth, async (c) => {
  const parsed = parseBodySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid' }, 400);
  const { query } = parsed.data;

  try {
    countLlmCall(MODEL_SEARCH);
    const { object } = await generateObject({
      model: aiProvider(MODEL_SEARCH),
      schema: searchFilterSchema,
      prompt: [
        'Terjemahkan kalimat pencarian operator (Bahasa Indonesia) menjadi filter terstruktur. Field yang tidak disebut → null. JANGAN menebak nilai di luar enum.',
        'Contoh:',
        '"alert kritis minggu ini" → {"severity":"critical","since":"7d"}',
        '"ais gap di WPP-711" → {"ruleType":"ais_gap","wppZone":"WPP-711"}',
        '"kasus BAKAMLA yang belum selesai" → {"agencyCode":"BAKAMLA","status":"in_progress"}',
        '"kapal asing bulan lalu" → {"since":"30d","vesselQuery":"asing"}',
        '"cari KM Sinar" → {"vesselQuery":"KM Sinar"}',
        `Kalimat: "${query}"`,
      ].join('\n'),
    });
    return c.json({ filter: object, source: 'llm' });
  } catch (e) {
    // Fallback null-safe: kalimat diperlakukan sebagai pencarian kapal bebas
    console.warn(`[search-parse] gagal: ${e instanceof Error ? e.message : e}`);
    const fallback: SearchFilter = { ...EMPTY_FILTER, vesselQuery: query };
    return c.json({ filter: fallback, source: 'fallback' });
  }
});
