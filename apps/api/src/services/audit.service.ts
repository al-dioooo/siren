// AuditLog append-only, non-blocking (plan 07 P1.1.3 / OPTIMIZATIONS.md §2.4).
// Tulis SETELAH respons terkirim via setImmediate — kegagalan dicatat, tidak melempar.
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma';

export type AuditEntry = {
  actorId: string | null;
  action: string; // mis. alert.dispatch, case.status_change
  targetType: string; // alert | case
  targetId: string;
  metaJson?: Record<string, unknown>;
};

/** Jadwalkan penulisan audit tanpa memblokir respons. */
export function writeAudit(entry: AuditEntry): void {
  setImmediate(async () => {
    try {
      await prisma.auditLog.create({
        data: {
          id: `audit_${randomUUID()}`,
          actorId: entry.actorId,
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId,
          metaJson: (entry.metaJson ?? {}) as object,
        },
      });
    } catch (e) {
      // Jangan pernah gagal diam-diam total — log untuk Test 4.1 plan 08
      console.error(`[audit] gagal menulis ${entry.action} ${entry.targetId}:`, e);
    }
  });
}
