'use server';

// Server Actions cases (plan 07 Stage 3) — wrapper tipis ke API VPS.
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/server/api';

export type CaseActionResult = { ok: boolean; error?: string };

function revalidateCase(caseId: string) {
  revalidatePath('/dashboard/cases');
  revalidatePath(`/dashboard/cases/${caseId}`);
}

async function toResult(res: Response, caseId: string): Promise<CaseActionResult> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? `HTTP ${res.status}` };
  }
  revalidateCase(caseId);
  return { ok: true };
}

export async function changeCaseStatus(
  caseId: string,
  toStatus: string,
  note?: string,
): Promise<CaseActionResult> {
  const res = await apiFetch(`/api/v1/cases/${encodeURIComponent(caseId)}/status`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toStatus, note }),
  });
  return toResult(res, caseId);
}

export async function addCaseNote(caseId: string, body: string): Promise<CaseActionResult> {
  const res = await apiFetch(`/api/v1/cases/${encodeURIComponent(caseId)}/updates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  return toResult(res, caseId);
}

export async function handoffCase(
  caseId: string,
  toAgencyCode: string,
  reason: string,
): Promise<CaseActionResult> {
  const res = await apiFetch(`/api/v1/cases/${encodeURIComponent(caseId)}/handoff`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toAgencyCode, reason }),
  });
  return toResult(res, caseId);
}

export async function uploadCaseAttachment(
  caseId: string,
  formData: FormData,
): Promise<CaseActionResult> {
  // FormData diteruskan apa adanya — boundary multipart diatur fetch
  const res = await apiFetch(`/api/v1/cases/${encodeURIComponent(caseId)}/attachments`, {
    method: 'POST',
    body: formData,
  });
  return toResult(res, caseId);
}
