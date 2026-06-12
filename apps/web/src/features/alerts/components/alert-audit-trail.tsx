import { EmptyText, SectionPanel } from "@/components/shared"
import { formatDateTime } from "@/lib/relative-time"
import type { AlertDetail } from "../alert-types"

const AUDIT_LABELS: Record<string, string> = {
  "alert.dispatch": "Alert di-dispatch",
  "alert.escalate": "Alert dieskalasi",
  "alert.false_positive": "Ditandai false positive",
}

/** Audit timeline (P1 — P2.2.5) */
export function AlertAuditTrail({ auditTrail }: { auditTrail: AlertDetail["auditTrail"] }) {
  return (
    <SectionPanel title="Aktivitas">
      {auditTrail.length === 0 ? (
        <EmptyText>Belum ada aksi pada alert ini.</EmptyText>
      ) : (
        <ol className="space-y-3">
          {auditTrail.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <span className="bg-signal mt-1.5 size-1.5 shrink-0 rounded-full" />
              <div className="min-w-0">
                <div className="text-foam text-sm">
                  {AUDIT_LABELS[entry.action] ?? entry.action}
                  {entry.actorName && <span className="text-mist-t"> — {entry.actorName}</span>}
                </div>
                <div className="font-data text-fathom text-xs">{formatDateTime(entry.createdAt)}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionPanel>
  )
}
