'use server';

// Server Actions tipis (plan 07 P2.2.4): forward cookie ke API VPS, lalu
// revalidate halaman alerts. Tidak ada akses DB dari Vercel.
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/server/api';

export type ActionResult = {
  ok: boolean;
  error?: string;
  /** `handoff_required` → UI menampilkan dialog konfirmasi handoff */
  code?: string;
  caseId?: string;
  caseCode?: string;
};

function revalidateAlert(alertId: string) {
  revalidatePath('/dashboard/alerts');
  revalidatePath(`/dashboard/alerts/${alertId}`);
  revalidatePath('/dashboard/cases');
  revalidatePath('/dashboard');
}

async function toResult(res: Response): Promise<ActionResult> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    return {
      ok: false,
      error: typeof body.error === 'string' ? body.error : `HTTP ${res.status}`,
      code: typeof body.code === 'string' ? body.code : undefined,
    };
  }
  const kasus = body.case as { id?: string; caseCode?: string } | undefined;
  return { ok: true, caseId: kasus?.id, caseCode: kasus?.caseCode };
}

export async function dispatchAlert(alertId: string, confirmHandoff = false): Promise<ActionResult> {
  const res = await apiFetch(`/api/v1/alerts/${encodeURIComponent(alertId)}/dispatch`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ confirmHandoff }),
  });
  const result = await toResult(res);
  if (result.ok) revalidateAlert(alertId);
  return result;
}

export async function escalateAlert(
  alertId: string,
  toAgencyCode: string,
  reason: string,
): Promise<ActionResult> {
  const res = await apiFetch(`/api/v1/alerts/${encodeURIComponent(alertId)}/escalate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toAgencyCode, reason }),
  });
  const result = await toResult(res);
  if (result.ok) revalidateAlert(alertId);
  return result;
}

export async function markFalsePositive(alertId: string, reason: string): Promise<ActionResult> {
  const res = await apiFetch(`/api/v1/alerts/${encodeURIComponent(alertId)}/false-positive`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const result = await toResult(res);
  if (result.ok) revalidateAlert(alertId);
  return result;
}
