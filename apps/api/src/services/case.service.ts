// Logika bisnis case (plan 07/08): list, detail, workflow status, catatan,
// handoff antar-agency, dan attachment. Route hanya parse/authorize/serialize.
import { randomUUID } from 'node:crypto';
import { customAlphabet } from 'nanoid';
import { CASE_STATUSES, CASE_TRANSITIONS, type CaseStatus } from '@siren/shared';
import { prisma } from '../lib/prisma';
import { CASE_ATTACHMENTS_BUCKET, supabaseAdmin } from '../lib/supabase';
import { writeAudit } from './audit.service';

const LIST_LIMIT = 50;
const SIGNED_URL_TTL_SECONDS = 3600;
const fileId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

// ── List (filter status + agency + scope) ──
export async function listCases(params: {
  scope: 'all' | 'mine';
  status?: string;
  agencyCode?: string;
  agencyId: string | null;
}) {
  const { scope, status, agencyCode, agencyId } = params;

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

  return cases.map((k) => ({
    id: k.id,
    caseCode: k.caseCode,
    status: k.status,
    vessel: k.vessel,
    agencyCode: k.assignedAgency.code,
    alert: k.alert,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }));
}

// ── Detail: alert + vessel + updates kronologis + attachments (signed URL) ──
export async function getCaseDetail(id: string) {
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
  if (!kasus) return null;

  // Signed URL 1 jam per attachment (bucket privat)
  const attachments = await Promise.all(
    kasus.attachments.map(async (a) => {
      const { data } = await supabaseAdmin()
        .storage.from(CASE_ATTACHMENTS_BUCKET)
        .createSignedUrl(a.storagePath, SIGNED_URL_TTL_SECONDS);
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

  return {
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
  };
}

// ── Workflow status: opened → in_progress → resolved|closed (ilegal → 409) ──
export async function changeCaseStatus(params: {
  id: string;
  toStatus: CaseStatus;
  note: string | null;
  userId: string;
}): Promise<
  | { outcome: 'not_found' }
  | { outcome: 'illegal_transition'; from: CaseStatus; to: CaseStatus }
  | { outcome: 'done'; status: CaseStatus }
> {
  const { id, toStatus, note, userId } = params;
  const kasus = await prisma.case.findUnique({ where: { id }, select: { status: true } });
  if (!kasus) return { outcome: 'not_found' };

  const from = kasus.status as CaseStatus;
  if (!CASE_TRANSITIONS[from]?.includes(toStatus)) {
    return { outcome: 'illegal_transition', from, to: toStatus };
  }

  await prisma.$transaction([
    prisma.case.update({ where: { id }, data: { status: toStatus } }),
    prisma.caseUpdate.create({
      data: {
        id: `cupd_${randomUUID()}`,
        caseId: id,
        authorId: userId,
        kind: 'status_change',
        body: note,
        fromStatus: from,
        toStatus,
      },
    }),
  ]);

  writeAudit({
    actorId: userId,
    action: 'case.status_change',
    targetType: 'case',
    targetId: id,
    metaJson: { fromStatus: from, toStatus },
  });
  return { outcome: 'done', status: toStatus };
}

// ── Catatan teks ──
export async function addCaseNote(params: { id: string; body: string; userId: string }) {
  const { id, body, userId } = params;
  const kasus = await prisma.case.findUnique({ where: { id }, select: { id: true } });
  if (!kasus) return null;

  const update = await prisma.caseUpdate.create({
    data: {
      id: `cupd_${randomUUID()}`,
      caseId: id,
      authorId: userId,
      kind: 'note',
      body,
    },
  });

  writeAudit({ actorId: userId, action: 'case.note', targetType: 'case', targetId: id });
  return update.id;
}

// ── Handoff antar-agency ──
export async function handoffCase(params: {
  id: string;
  toAgencyCode: string;
  reason: string;
  userId: string;
}): Promise<
  | { outcome: 'not_found' }
  | { outcome: 'unknown_agency' }
  | { outcome: 'same_agency' }
  | { outcome: 'done'; agencyCode: string }
> {
  const { id, toAgencyCode, reason, userId } = params;
  const kasus = await prisma.case.findUnique({
    where: { id },
    include: { assignedAgency: { select: { code: true } } },
  });
  if (!kasus) return { outcome: 'not_found' };

  const toAgency = await prisma.agency.findUnique({ where: { code: toAgencyCode } });
  if (!toAgency) return { outcome: 'unknown_agency' };
  if (toAgency.id === kasus.assignedAgencyId) return { outcome: 'same_agency' };

  await prisma.$transaction([
    prisma.case.update({ where: { id }, data: { assignedAgencyId: toAgency.id } }),
    prisma.caseUpdate.create({
      data: {
        id: `cupd_${randomUUID()}`,
        caseId: id,
        authorId: userId,
        kind: 'handoff',
        body: `${kasus.assignedAgency.code} → ${toAgency.code}: ${reason}`,
      },
    }),
  ]);

  writeAudit({
    actorId: userId,
    action: 'case.handoff',
    targetType: 'case',
    targetId: id,
    metaJson: { fromAgency: kasus.assignedAgency.code, toAgency: toAgency.code, reason },
  });
  return { outcome: 'done', agencyCode: toAgency.code };
}

// ── Attachment: upload → Supabase Storage + record DB + signed URL ──
export async function caseExists(id: string) {
  return Boolean(await prisma.case.findUnique({ where: { id }, select: { id: true } }));
}

export async function uploadCaseAttachment(params: {
  id: string;
  file: File;
  userId: string;
}): Promise<
  | { outcome: 'storage_error'; message: string }
  | { outcome: 'done'; attachment: { id: string; fileName: string; url: string | null } }
> {
  const { id, file, userId } = params;
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
  if (error) return { outcome: 'storage_error', message: error.message };

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

  const { data: signed } = await storage
    .from(CASE_ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  writeAudit({
    actorId: userId,
    action: 'case.attachment_upload',
    targetType: 'case',
    targetId: id,
    metaJson: { fileName: file.name, sizeBytes: file.size },
  });
  return {
    outcome: 'done',
    attachment: { id: attachment.id, fileName: file.name, url: signed?.signedUrl ?? null },
  };
}
