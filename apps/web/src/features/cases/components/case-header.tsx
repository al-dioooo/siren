import { CASE_STATUSES, type CaseStatus } from "@siren/shared/constants"
import { StatusBadge } from "@/components/shared"
import { formatDateTime, relativeTime } from "@/lib/relative-time"
import { cn } from "@/lib/utils"
import type { CaseDetail } from "../case-types"

const STATUS_STEP_LABELS: Record<CaseStatus, string> = {
  opened: "Opened",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
}

export function CaseHeader({ kasus }: { kasus: CaseDetail }) {
  const vesselLabel = kasus.vessel.name ?? `MMSI ${kasus.vessel.mmsi}`

  return (
    <header className="border-fog bg-trench rounded-sm border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-data text-signal-bright text-sm">{kasus.caseCode}</span>
            <StatusBadge status={kasus.status} />
            <span className="border-territory/40 text-territory font-data rounded-sm border px-1.5 py-0.5 text-[0.625rem] uppercase">
              {kasus.agency.code}
            </span>
          </div>
          <h1 className="font-display truncate text-xl font-semibold">{vesselLabel}</h1>
          <p className="text-mist-t text-sm">
            Dibuka {relativeTime(kasus.createdAt)} oleh {kasus.openedBy.name} ·{" "}
            <span className="font-data">{formatDateTime(kasus.createdAt)}</span>
          </p>
        </div>
        <StatusStepper current={kasus.status} />
      </div>
    </header>
  )
}

/** Stepper workflow (plan 07 P3.1.2): opened → in_progress → resolved/closed. */
function StatusStepper({ current }: { current: CaseStatus }) {
  const currentIdx = CASE_STATUSES.indexOf(current)
  return (
    <ol className="flex items-center gap-1">
      {CASE_STATUSES.map((status, idx) => {
        const reached = idx <= currentIdx
        const active = status === current
        return (
          <li key={status} className="flex items-center gap-1">
            {idx > 0 && <span className={cn("h-px w-5", reached ? "bg-signal" : "bg-fog")} />}
            <span
              className={cn(
                "font-data rounded-sm border px-2 py-1 text-[0.625rem] uppercase",
                active
                  ? "border-signal bg-signal/15 text-signal-bright"
                  : reached
                    ? "border-signal/40 text-signal-bright/70"
                    : "border-fog text-fathom",
              )}
            >
              {STATUS_STEP_LABELS[status]}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
