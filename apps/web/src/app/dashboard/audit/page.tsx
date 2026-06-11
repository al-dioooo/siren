import { Suspense } from "react"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"
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
import { formatDateTime } from "@/lib/relative-time"
import { cn } from "@/lib/utils"
import { AuditFilters } from "./audit-filters"

type AuditEntry = {
  id: string
  action: string
  targetType: string
  targetId: string
  actorName: string | null
  actorEmail: string | null
  metaJson: Record<string, unknown>
  createdAt: string
}

/** Warna badge per kelompok action (alert = violet, case = cyan). */
function actionBadgeClass(action: string): string {
  if (action.startsWith("alert.")) return "border-signal/40 bg-signal/10 text-signal-bright"
  if (action === "case.evidence_generated") return "border-ok/40 bg-ok/10 text-ok"
  return "border-territory/40 bg-territory/10 text-territory"
}

const AUDIT_PARAMS = ["action", "actor", "from", "to", "cursor"] as const

export default function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Audit Log</h1>
        <p className="text-mist-t text-sm">
          Jejak append-only semua aksi operator — akuntabilitas multi-agency (SDG 16).
        </p>
      </header>
      <AuditFilters />
      <Suspense fallback={<AuditSkeleton />}>
        <AuditTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function AuditTable({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const key of AUDIT_PARAMS) {
    const value = params[key]
    if (typeof value === "string" && value) qs.set(key, value)
  }

  const res = await apiFetch(`/api/v1/audit?${qs}`)
  if (res.status === 403) {
    return (
      <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
        <ShieldCheck className="text-fathom mx-auto mb-3 size-8" />
        <h2 className="font-display mb-1 text-lg font-semibold">Akses admin diperlukan</h2>
        <p className="text-mist-t text-sm">Halaman audit hanya tersedia untuk role admin.</p>
      </div>
    )
  }
  if (!res.ok) {
    return (
      <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
        <p className="text-mist-t text-sm">Audit log tidak dapat dimuat — coba muat ulang halaman.</p>
      </div>
    )
  }

  const { entries, nextCursor } = (await res.json()) as {
    entries: AuditEntry[]
    nextCursor: string | null
  }

  if (entries.length === 0) {
    return (
      <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
        <p className="text-mist-t text-sm">Tidak ada entri untuk filter ini.</p>
      </div>
    )
  }

  const nextParams = new URLSearchParams(qs)
  if (nextCursor) nextParams.set("cursor", nextCursor)

  return (
    <div className="border-fog bg-trench overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow className="border-fog hover:bg-transparent">
            <TableHead>Waktu</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Meta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id} className="border-fog hover:bg-deck/60">
              <TableCell className="font-data text-fathom text-xs whitespace-nowrap">
                {formatDateTime(e.createdAt)}
              </TableCell>
              <TableCell>
                <span className="text-foam block text-sm">{e.actorName ?? "sistem"}</span>
                {e.actorEmail && (
                  <span className="font-data text-fathom text-xs">{e.actorEmail}</span>
                )}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "font-data inline-flex rounded-sm border px-1.5 py-0.5 text-[0.6875rem]",
                    actionBadgeClass(e.action),
                  )}
                >
                  {e.action}
                </span>
              </TableCell>
              <TableCell className="font-data text-mist-t text-xs">
                {e.targetType}/{e.targetId.slice(0, 18)}…
              </TableCell>
              <TableCell className="font-data text-fathom max-w-72 truncate text-xs">
                {JSON.stringify(e.metaJson)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {nextCursor && (
        <div className="border-fog flex justify-center border-t p-3">
          <Link
            href={`/dashboard/audit?${nextParams}`}
            className="font-data text-signal-bright text-xs uppercase hover:underline"
          >
            Muat 100 berikutnya →
          </Link>
        </div>
      )}
    </div>
  )
}

function AuditSkeleton() {
  return (
    <div className="border-fog bg-trench space-y-3 rounded-sm border p-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}
