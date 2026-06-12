import Link from "next/link"
import { RULE_LABELS, type RuleType } from "@siren/shared/constants"
import { SeverityChip, StatusBadge } from "@/components/shared"
import { formatDateTime, relativeTime } from "@/lib/relative-time"
import type { AlertDetail } from "../alert-types"
import { AlertActionBar } from "./action-bar"

export function AlertHeader({
  alert,
  ownAgency,
}: {
  alert: AlertDetail
  ownAgency: string | null
}) {
  const vesselLabel = alert.vessel.name ?? `MMSI ${alert.vessel.mmsi}`

  return (
    <header className="border-fog bg-trench rounded-sm border p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SeverityChip severity={alert.severity} />
            <StatusBadge status={alert.status} />
            {alert.agency && (
              <span className="border-territory/40 text-territory font-data rounded-sm border px-1.5 py-0.5 text-[0.625rem] uppercase">
                {alert.agency.code}
              </span>
            )}
          </div>
          <h1 className="font-display truncate text-xl font-semibold">{vesselLabel}</h1>
          <p className="text-mist-t text-sm">
            {RULE_LABELS[alert.ruleType as RuleType] ?? alert.ruleType} ·{" "}
            <span className="font-data">{formatDateTime(alert.createdAt)}</span> (
            {relativeTime(alert.createdAt)})
          </p>
          {alert.case && (
            <Link
              href={`/dashboard/cases/${alert.case.id}`}
              className="font-data text-signal-bright mt-1 inline-block text-xs uppercase hover:underline"
            >
              Case terkait: {alert.case.caseCode} →
            </Link>
          )}
        </div>
        <AlertActionBar
          alertId={alert.id}
          status={alert.status}
          ownAgency={ownAgency}
          alertAgencyCode={alert.agency?.code ?? null}
        />
      </div>
    </header>
  )
}
