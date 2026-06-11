import { Suspense } from "react"
import Link from "next/link"
import { RULE_LABELS, type AlertStatus, type RuleType, type Severity } from "@siren/shared"
import { SeverityChip, StatusBadge } from "@/components/siren"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetch } from "@/server/api"
import { relativeTime } from "@/lib/relative-time"
import { QueueFilters } from "./queue-filters"
import { QuickDispatch } from "./quick-dispatch"

const QUEUE_PARAMS = [
  "scope", "severity", "ruleType", "status", "since", "wppZone",
  "vesselQuery", "agencyCode", "cursor",
] as const

type QueueAlert = {
  id: string
  ruleType: string
  severity: Severity
  status: AlertStatus
  createdAt: string
  vessel: { name: string | null; mmsi: string; flag: string | null }
  agencyCode: string | null
}

export default function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold">Alerts Queue</h1>
          <p className="text-mist-t text-sm">Triase pelanggaran terdeteksi — filter, periksa, dispatch.</p>
        </div>
      </header>
      <QueueFilters />
      <Suspense fallback={<QueueSkeleton />}>
        <AlertsTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function AlertsTable({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams({ limit: "50", scope: "all" })
  for (const key of QUEUE_PARAMS) {
    const value = params[key]
    if (typeof value === "string" && value) qs.set(key, value)
  }

  const res = await apiFetch(`/api/v1/alerts?${qs}`)
  if (!res.ok) {
    return <QueueEmpty text="Queue tidak dapat dimuat — coba muat ulang halaman." />
  }
  const { alerts, nextCursor } = (await res.json()) as {
    alerts: QueueAlert[]
    nextCursor: string | null
  }

  if (alerts.length === 0) {
    return <QueueEmpty text="Tidak ada alert untuk kombinasi filter ini." />
  }

  const nextParams = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v && k !== "cursor") nextParams.set(k, v)
  }
  if (nextCursor) nextParams.set("cursor", nextCursor)

  return (
    <div className="border-fog bg-trench overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow className="border-fog hover:bg-transparent">
            <TableHead>Severity</TableHead>
            <TableHead>Kapal</TableHead>
            <TableHead>Rule</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Waktu</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((a) => {
            const vesselLabel = a.vessel.name ?? `MMSI ${a.vessel.mmsi}`
            return (
              <TableRow key={a.id} className="border-fog hover:bg-deck/60 relative">
                <TableCell>
                  <SeverityChip severity={a.severity} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/dashboard/alerts/${a.id}`}
                    className="text-foam after:absolute after:inset-0 block text-sm font-medium hover:underline"
                  >
                    {vesselLabel}
                  </Link>
                  <span className="font-data text-fathom text-xs">
                    MMSI {a.vessel.mmsi}
                    {a.vessel.flag ? ` · ${a.vessel.flag}` : ""}
                  </span>
                </TableCell>
                <TableCell className="text-mist-t text-sm">
                  {RULE_LABELS[a.ruleType as RuleType] ?? a.ruleType}
                </TableCell>
                <TableCell>
                  {a.agencyCode ? (
                    <span className="border-territory/40 text-territory font-data rounded-sm border px-1.5 py-0.5 text-[0.625rem] uppercase">
                      {a.agencyCode}
                    </span>
                  ) : (
                    <span className="text-fathom text-xs">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={a.status} />
                </TableCell>
                <TableCell className="font-data text-fathom text-xs">
                  {relativeTime(a.createdAt)}
                </TableCell>
                <TableCell className="relative z-10 text-right">
                  {a.status === "new" && <QuickDispatch alertId={a.id} vesselLabel={vesselLabel} />}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {nextCursor && (
        <div className="border-fog flex justify-center border-t p-3">
          <Link
            href={`/dashboard/alerts?${nextParams}`}
            className="font-data text-signal-bright text-xs uppercase hover:underline"
          >
            Muat 50 berikutnya →
          </Link>
        </div>
      )}
    </div>
  )
}

function QueueEmpty({ text }: { text: string }) {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <div className="bg-deck mx-auto mb-3 grid size-10 place-items-center rounded-sm">
        <span className="bg-ok size-2 rounded-full" />
      </div>
      <p className="text-mist-t text-sm">{text}</p>
    </div>
  )
}

function QueueSkeleton() {
  return (
    <div className="border-fog bg-trench space-y-3 rounded-sm border p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
