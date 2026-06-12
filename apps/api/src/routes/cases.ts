// Cases API (plan 07 Stage 1 Module 1.2): route tipis — parse, authorize,
// delegasi ke case.service, lalu serialize. Logika bisnis ada di service.
import { Hono } from 'hono';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_WHITELIST,
  caseHandoffSchema,
  caseNoteSchema,
  caseStatusChangeSchema,
} from '@siren/shared';
import { requireAuth } from '../middleware/require-auth';
import { renderEvidencePdf } from '../pdf/evidence-pdf';
import { writeAudit } from '../services/audit.service';
import {
  addCaseNote,
  caseExists,
  changeCaseStatus,
  getCaseDetail,
  handoffCase,
  listCases,
  uploadCaseAttachment,
} from '../services/case.service';
import { collectEvidence, fetchStaticMap } from '../services/evidence.service';
import type { AppEnv } from '../types';

export const caseRoutes = new Hono<AppEnv>();

// ── List (filter status + agency + scope) ──
caseRoutes.get('/api/v1/cases', requireAuth, async (c) => {
  const scope = c.req.query('scope') === 'all' ? 'all' : 'mine';
  const cases = await listCases({
    scope,
    status: c.req.query('status'),
    agencyCode: c.req.query('agencyCode'),
    agencyId: c.get('agencyId'),
  });
  return c.json({ scope, cases });
});

// ── Detail: alert + vessel + updates kronologis + attachments (signed URL) ──
caseRoutes.get('/api/v1/cases/:id', requireAuth, async (c) => {
  const detail = await getCaseDetail(c.req.param('id'));
  if (!detail) return c.json({ error: 'Case tidak ditemukan' }, 404);
  return c.json(detail);
});

// ── Evidence PDF (plan 08 P2.1.4): stream application/pdf + audit ──
caseRoutes.get('/api/v1/cases/:id/evidence.pdf', requireAuth, async (c) => {
  const id = c.req.param('id');
  const data = await collectEvidence(id);
  if (!data) return c.json({ error: 'Case tidak ditemukan' }, 404);

  // Peta gagal → placeholder di template, PDF tetap terbit (Test 2.2)
  const mapPng = await fetchStaticMap(data.alert.lat, data.alert.lng);
  const pdf = await renderEvidencePdf(data, mapPng);

  writeAudit({
    actorId: c.get('userId'),
    action: 'case.evidence_generated',
    targetType: 'case',
    targetId: id,
    metaJson: { caseCode: data.caseCode, mapEmbedded: mapPng !== null, bytes: pdf.length },
  });

  return c.body(new Uint8Array(pdf), 200, {
    'content-type': 'application/pdf',
    'content-disposition': `attachment; filename="evidence-${data.caseCode}.pdf"`,
  });
});

// ── Workflow status: opened → in_progress → resolved|closed (ilegal → 409) ──
caseRoutes.post('/api/v1/cases/:id/status', requireAuth, async (c) => {
  const parsed = caseStatusChangeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (toStatus)' }, 400);

  const result = await changeCaseStatus({
    id: c.req.param('id'),
    toStatus: parsed.data.toStatus,
    note: parsed.data.note ?? null,
    userId: c.get('userId'),
  });

  if (result.outcome === 'not_found') return c.json({ error: 'Case tidak ditemukan' }, 404);
  if (result.outcome === 'illegal_transition') {
    return c.json({ error: `Transisi ${result.from} → ${result.to} tidak diizinkan` }, 409);
  }
  return c.json({ ok: true, status: result.status });
});

// ── Catatan teks ──
caseRoutes.post('/api/v1/cases/:id/updates', requireAuth, async (c) => {
  const parsed = caseNoteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (body 1–2000 char)' }, 400);

  const updateId = await addCaseNote({
    id: c.req.param('id'),
    body: parsed.data.body,
    userId: c.get('userId'),
  });
  if (!updateId) return c.json({ error: 'Case tidak ditemukan' }, 404);
  return c.json({ ok: true, updateId }, 201);
});

// ── Handoff antar-agency ──
caseRoutes.post('/api/v1/cases/:id/handoff', requireAuth, async (c) => {
  const parsed = caseHandoffSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (toAgencyCode, reason)' }, 400);

  const result = await handoffCase({
    id: c.req.param('id'),
    toAgencyCode: parsed.data.toAgencyCode,
    reason: parsed.data.reason,
    userId: c.get('userId'),
  });

  if (result.outcome === 'not_found') return c.json({ error: 'Case tidak ditemukan' }, 404);
  if (result.outcome === 'unknown_agency') {
    return c.json({ error: `Agency ${parsed.data.toAgencyCode} tidak dikenal` }, 400);
  }
  if (result.outcome === 'same_agency') {
    return c.json({ error: 'Case sudah berada di agency tersebut' }, 409);
  }
  return c.json({ ok: true, agencyCode: result.agencyCode });
});

// ── Attachment: multipart upload → Supabase Storage (5MB, jpg/png/pdf) ──
caseRoutes.post('/api/v1/cases/:id/attachments', requireAuth, async (c) => {
  const id = c.req.param('id');
  if (!(await caseExists(id))) return c.json({ error: 'Case tidak ditemukan' }, 404);

  const body = await c.req.parseBody().catch(() => null);
  const file = body?.file;
  if (!(file instanceof File)) return c.json({ error: 'Field `file` (multipart) wajib' }, 400);
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return c.json({ error: `File melebihi batas ${ATTACHMENT_MAX_BYTES / 1024 / 1024}MB` }, 413);
  }
  if (!(ATTACHMENT_MIME_WHITELIST as readonly string[]).includes(file.type)) {
    return c.json({ error: 'Tipe file harus jpg, png, atau pdf' }, 415);
  }

  const result = await uploadCaseAttachment({ id, file, userId: c.get('userId') });
  if (result.outcome === 'storage_error') {
    return c.json({ error: `Upload gagal: ${result.message}` }, 502);
  }
  return c.json({ ok: true, attachment: result.attachment }, 201);
});
