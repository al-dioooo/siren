// Cases API (plan 07 Stage 1 Module 1.2): list, detail, workflow status,
// catatan, handoff antar-agency, dan attachment ke Supabase Storage.
import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { customAlphabet } from 'nanoid';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_WHITELIST,
  CASE_STATUSES,
  CASE_TRANSITIONS,
  caseHandoffSchema,
  caseNoteSchema,
  caseStatusChangeSchema,
  type CaseStatus,
} from '@siren/shared';
import { prisma } from '../lib/prisma';
import { CASE_ATTACHMENTS_BUCKET, supabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/require-auth';
import { renderEvidencePdf } from '../pdf/evidence-pdf';
import { writeAudit } from '../services/audit.service';
import { collectEvidence, fetchStaticMap } from '../services/evidence.service';
import type { AppEnv } from '../types';

export const caseRoutes = new Hono<AppEnv>();

const LIST_LIMIT = 50;
const fileId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

// ── List (filter status + agency + scope) ──
caseRoutes.get('/api/v1/cases', requireAuth, async (c) => {
  const scope = c.req.query('scope') === 'all' ? 'all' : 'mine';
  const status = c.req.query('status');
  const agencyCode = c.req.query('agencyCode');
  const agencyId = c.get('agencyId');

  const filterAgencyId = agencyCode
    ? (await prisma.agency.findUnique({ where: { code: agencyCode }, select: { id: true } }))?.id
    : undefined;

  const cases = await prisma.case.findMany({
    where: {
      ...(scope === 'mine' && agencyId ? { assignedAgencyId: agencyId } : {}),
      ...(filterAgencyId ? { assignedAgencyId: filterAgencyId } : {}),
      ...(status && (CASE_STATUSES as readonly string[]).includes(status) ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    include: {
      vessel: { select: { name: true, mmsi: true, flag: true } },
      assignedAgency: { select: { code: true } },
      alert: { select: { id: true, ruleType: true, severity: true } },
    },
  });

  return c.json({
    scope,
    cases: cases.map((k) => ({
      id: k.id,
      caseCode: k.caseCode,
      status: k.status,
      vessel: k.vessel,
      agencyCode: k.assignedAgency.code,
      alert: k.alert,
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    })),
  });
});

// ── Detail: alert + vessel + updates kronologis + attachments (signed URL) ──
caseRoutes.get('/api/v1/cases/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const kasus = await prisma.case.findUnique({
    where: { id },
    include: {
      vessel: true,
      assignedAgency: { select: { id: true, code: true, name: true } },
      openedBy: { select: { name: true, email: true } },
      alert: {
        include: {
          assignedAgency: { select: { code: true } },
        },
      },
      updates: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { name: true } } },
      },
      attachments: {
        orderBy: { createdAt: 'asc' },
        include: { uploader: { select: { name: true } } },
      },
    },
  });
  if (!kasus) return c.json({ error: 'Case tidak ditemukan' }, 404);

  // Signed URL 1 jam per attachment (bucket privat)
  const attachments = await Promise.all(
    kasus.attachments.map(async (a) => {
      const { data } = await supabaseAdmin()
        .storage.from(CASE_ATTACHMENTS_BUCKET)
        .createSignedUrl(a.storagePath, 3600);
      return {
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uploaderName: a.uploader.name,
        url: data?.signedUrl ?? null,
        createdAt: a.createdAt.toISOString(),
      };
    }),
  );

  return c.json({
    id: kasus.id,
    caseCode: kasus.caseCode,
    status: kasus.status,
    allowedTransitions: CASE_TRANSITIONS[kasus.status as CaseStatus] ?? [],
    vessel: kasus.vessel,
    agency: kasus.assignedAgency,
    openedBy: kasus.openedBy,
    alert: {
      id: kasus.alert.id,
      ruleType: kasus.alert.ruleType,
      severity: kasus.alert.severity,
      status: kasus.alert.status,
      lat: kasus.alert.lat,
      lng: kasus.alert.lng,
      agencyCode: kasus.alert.assignedAgency?.code ?? null,
      createdAt: kasus.alert.createdAt.toISOString(),
    },
    updates: kasus.updates.map((u) => ({
      id: u.id,
      kind: u.kind,
      body: u.body,
      fromStatus: u.fromStatus,
      toStatus: u.toStatus,
      authorName: u.author.name,
      createdAt: u.createdAt.toISOString(),
    })),
    attachments,
    createdAt: kasus.createdAt.toISOString(),
    updatedAt: kasus.updatedAt.toISOString(),
  });
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
  const id = c.req.param('id');
  const parsed = caseStatusChangeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (toStatus)' }, 400);

  const kasus = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kasus) return c.json({ error: 'Case tidak ditemukan' }, 404);

  const from = kasus.status as CaseStatus;
  const to = parsed.data.toStatus;
  if (!CASE_TRANSITIONS[from]?.includes(to)) {
    return c.json({ error: `Transisi ${from} → ${to} tidak diizinkan` }, 409);
  }

  const userId = c.get('userId');
  await prisma.$transaction([
    prisma.case.update({ where: { id }, data: { status: to } }),
    prisma.caseUpdate.create({
      data: {
        id: `cupd_${randomUUID()}`,
        caseId: id,
        authorId: userId,
        kind: 'status_change',
        body: parsed.data.note ?? null,
        fromStatus: from,
        toStatus: to,
      },
    }),
  ]);

  writeAudit({
    actorId: userId,
    action: 'case.status_change',
    targetType: 'case',
    targetId: id,
    metaJson: { fromStatus: from, toStatus: to },
  });
  return c.json({ ok: true, status: to });
});

// ── Catatan teks ──
caseRoutes.post('/api/v1/cases/:id/updates', requireAuth, async (c) => {
  const id = c.req.param('id');
  const parsed = caseNoteSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (body 1–2000 char)' }, 400);

  const kasus = await prisma.case.findUnique({ where: { id }, select: { id: true } });
  if (!kasus) return c.json({ error: 'Case tidak ditemukan' }, 404);

  const userId = c.get('userId');
  const update = await prisma.caseUpdate.create({
    data: {
      id: `cupd_${randomUUID()}`,
      caseId: id,
      authorId: userId,
      kind: 'note',
      body: parsed.data.body,
    },
  });

  writeAudit({ actorId: userId, action: 'case.note', targetType: 'case', targetId: id });
  return c.json({ ok: true, updateId: update.id }, 201);
});

// ── Handoff antar-agency ──
caseRoutes.post('/api/v1/cases/:id/handoff', requireAuth, async (c) => {
  const id = c.req.param('id');
  const parsed = caseHandoffSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Body tidak valid (toAgencyCode, reason)' }, 400);

  const kasus = await prisma.case.findUnique({
    where: { id },
    include: { assignedAgency: { select: { code: true } } },
  });
  if (!kasus) return c.json({ error: 'Case tidak ditemukan' }, 404);

  const toAgency = await prisma.agency.findUnique({ where: { code: parsed.data.toAgencyCode } });
  if (!toAgency) return c.json({ error: `Agency ${parsed.data.toAgencyCode} tidak dikenal` }, 400);
  if (toAgency.id === kasus.assignedAgencyId) {
    return c.json({ error: 'Case sudah berada di agency tersebut' }, 409);
  }

  const userId = c.get('userId');
  await prisma.$transaction([
    prisma.case.update({ where: { id }, data: { assignedAgencyId: toAgency.id } }),
    prisma.caseUpdate.create({
      data: {
        id: `cupd_${randomUUID()}`,
        caseId: id,
        authorId: userId,
        kind: 'handoff',
        body: `${kasus.assignedAgency.code} → ${toAgency.code}: ${parsed.data.reason}`,
      },
    }),
  ]);

  writeAudit({
    actorId: userId,
    action: 'case.handoff',
    targetType: 'case',
    targetId: id,
    metaJson: { fromAgency: kasus.assignedAgency.code, toAgency: toAgency.code, reason: parsed.data.reason },
  });
  return c.json({ ok: true, agencyCode: toAgency.code });
});

// ── Attachment: multipart upload → Supabase Storage (5MB, jpg/png/pdf) ──
caseRoutes.post('/api/v1/cases/:id/attachments', requireAuth, async (c) => {
  const id = c.req.param('id');
  const kasus = await prisma.case.findUnique({ where: { id }, select: { id: true } });
  if (!kasus) return c.json({ error: 'Case tidak ditemukan' }, 404);

  const body = await c.req.parseBody().catch(() => null);
  const file = body?.file;
  if (!(file instanceof File)) return c.json({ error: 'Field `file` (multipart) wajib' }, 400);
  if (file.size > ATTACHMENT_MAX_BYTES) {
    return c.json({ error: `File melebihi batas ${ATTACHMENT_MAX_BYTES / 1024 / 1024}MB` }, 413);
  }
  if (!(ATTACHMENT_MIME_WHITELIST as readonly string[]).includes(file.type)) {
    return c.json({ error: 'Tipe file harus jpg, png, atau pdf' }, 415);
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const storagePath = `${id}/${fileId()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const storage = supabaseAdmin().storage;
  let { error } = await storage.from(CASE_ATTACHMENTS_BUCKET).upload(storagePath, bytes, {
    contentType: file.type,
  });
  if (error && /bucket/i.test(error.message)) {
    // Bucket belum ada (deploy baru) — buat privat lalu coba sekali lagi
    await storage.createBucket(CASE_ATTACHMENTS_BUCKET, { public: false });
    ({ error } = await storage.from(CASE_ATTACHMENTS_BUCKET).upload(storagePath, bytes, {
      contentType: file.type,
    }));
  }
  if (error) return c.json({ error: `Upload gagal: ${error.message}` }, 502);

  const userId = c.get('userId');
  const [attachment] = await prisma.$transaction([
    prisma.caseAttachment.create({
      data: {
        id: `catt_${randomUUID()}`,
        caseId: id,
        uploaderId: userId,
        storagePath,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    }),
    prisma.caseUpdate.create({
      data: {
        id: `cupd_${randomUUID()}`,
        caseId: id,
        authorId: userId,
        kind: 'attachment',
        body: file.name,
      },
    }),
  ]);

  const { data: signed } = await storage.from(CASE_ATTACHMENTS_BUCKET).createSignedUrl(storagePath, 3600);

  writeAudit({
    actorId: userId,
    action: 'case.attachment_upload',
    targetType: 'case',
    targetId: id,
    metaJson: { fileName: file.name, sizeBytes: file.size },
  });
  return c.json(
    { ok: true, attachment: { id: attachment.id, fileName: file.name, url: signed?.signedUrl ?? null } },
    201,
  );
});
