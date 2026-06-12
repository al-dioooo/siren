import { Suspense } from "react"
import Link from "next/link"
import { RULE_LABELS, type CaseStatus, type RuleType, type Severity } from "@siren/shared/constants"
import { SeverityChip, StatusBadge } from "@/components/shared"
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
import { CaseFilters } from "@/features/cases/components/case-filters"

type CaseRow = {
  id: string
  caseCode: string
  status: CaseStatus
  vessel: { name: string | null; mmsi: string; flag: string | null }
  agencyCode: string
  alert: { id: string; ruleType: string; severity: Severity }
  createdAt: string
}

const LIST_PARAMS = ["scope", "status", "agencyCode"] as const

export default function CasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Cases</h1>
        <p className="text-mist-t text-sm">Kasus penindakan hasil dispatch — pantau status sampai selesai.</p>
      </header>
      <CaseFilters />
      <Suspense fallback={<CasesSkeleton />}>
        <CasesTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function CasesTable({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const key of LIST_PARAMS) {
    const value = params[key]
    if (typeof value === "string" && value) qs.set(key, value)
  }

  const res = await apiFetch(`/api/v1/cases?${qs}`)
  if (!res.ok) {
    return <CasesEmpty text="Cases tidak dapat dimuat — coba muat ulang halaman." />
  }
  const { cases } = (await res.json()) as { cases: CaseRow[] }

  if (cases.length === 0) {
    return <CasesEmpty text="Belum ada case untuk filter ini — dispatch alert untuk membuka case." />
  }

  return (
    <div className="border-fog bg-trench overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow className="border-fog hover:bg-transparent">
            <TableHead>Case</TableHead>
            <TableHead>Kapal</TableHead>
            <TableHead>Pelanggaran</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Umur</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((k) => (
            <TableRow key={k.id} className="border-fog hover:bg-deck/60 relative">
              <TableCell>
                <Link
                  href={`/dashboard/cases/${k.id}`}
                  className="font-data text-signal-bright after:absolute after:inset-0 text-sm hover:underline"
                >
                  {k.caseCode}
                </Link>
              </TableCell>
              <TableCell>
                <span className="text-foam block text-sm font-medium">
                  {k.vessel.name ?? `MMSI ${k.vessel.mmsi}`}
                </span>
                <span className="font-data text-fathom text-xs">MMSI {k.vessel.mmsi}</span>
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <SeverityChip severity={k.alert.severity} />
                  <span className="text-mist-t text-sm">
                    {RULE_LABELS[k.alert.ruleType as RuleType] ?? k.alert.ruleType}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <span className="border-territory/40 text-territory font-data rounded-sm border px-1.5 py-0.5 text-[0.625rem] uppercase">
                  {k.agencyCode}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={k.status} />
              </TableCell>
              <TableCell className="font-data text-fathom text-xs">{relativeTime(k.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CasesEmpty({ text }: { text: string }) {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <div className="bg-deck mx-auto mb-3 grid size-10 place-items-center rounded-sm">
        <span className="bg-ok size-2 rounded-full" />
      </div>
      <p className="text-mist-t text-sm">{text}</p>
    </div>
  )
}

function CasesSkeleton() {
  return (
    <div className="border-fog bg-trench space-y-3 rounded-sm border p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
