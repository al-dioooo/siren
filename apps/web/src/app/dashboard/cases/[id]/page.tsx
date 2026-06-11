import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowRightLeft, FileDown, MessageSquare, Paperclip } from "lucide-react"
import {
  CASE_STATUSES,
  RULE_LABELS,
  type AlertStatus,
  type CaseStatus,
  type RuleType,
  type Severity,
} from "@siren/shared"
import { DataRow, SeverityChip, StatusBadge } from "@/components/siren"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/server/api"
import { formatDateTime, relativeTime } from "@/lib/relative-time"
import { cn } from "@/lib/utils"
import { CaseControls } from "./case-controls"

type CaseDetail = {
  id: string
  caseCode: string
  status: CaseStatus
  allowedTransitions: CaseStatus[]
  vessel: { id: string; mmsi: string; name: string | null; flag: string | null; vesselType: string | null }
  agency: { id: string; code: string; name: string }
  openedBy: { name: string }
  alert: {
    id: string
    ruleType: string
    severity: Severity
    status: AlertStatus
    lat: number
    lng: number
    agencyCode: string | null
    createdAt: string
  }
  updates: Array<{
    id: string
    kind: "note" | "status_change" | "handoff" | "attachment"
    body: string | null
    fromStatus: string | null
    toStatus: string | null
    authorName: string
    createdAt: string
  }>
  attachments: Array<{
    id: string
    fileName: string
    mimeType: string
    sizeBytes: number
    uploaderName: string
    url: string | null
    createdAt: string
  }>
  createdAt: string
}

const STATUS_STEP_LABELS: Record<CaseStatus, string> = {
  opened: "Opened",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<CaseSkeleton />}>
      <CaseDetailContent params={params} />
    </Suspense>
  )
}

async function CaseDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await apiFetch(`/api/v1/cases/${encodeURIComponent(id)}`)
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`Case detail gagal dimuat: HTTP ${res.status}`)
  const kasus = (await res.json()) as CaseDetail

  const vesselLabel = kasus.vessel.name ?? `MMSI ${kasus.vessel.mmsi}`

  return (
    <div className="space-y-4">
      {/* Header + stepper */}
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          {/* Kontrol */}
          <section className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Tindakan</h2>
            <CaseControls
              caseId={kasus.id}
              agencyCode={kasus.agency.code}
              allowedTransitions={kasus.allowedTransitions}
              pdfReady
            />
          </section>

          {/* Timeline */}
          <section className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Timeline</h2>
            {kasus.updates.length === 0 ? (
              <p className="text-mist-t text-sm">Belum ada aktivitas pada case ini.</p>
            ) : (
              <ol className="space-y-4">
                {kasus.updates.map((u) => (
                  <TimelineEntry key={u.id} update={u} attachments={kasus.attachments} />
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-4">
          {/* Linked alert card */}
          <Link
            href={`/dashboard/alerts/${kasus.alert.id}`}
            className="border-fog bg-trench hover:border-signal/50 block rounded-sm border p-4 transition-colors"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Alert Asal</h2>
              <SeverityChip severity={kasus.alert.severity} />
            </div>
            <p className="text-foam text-sm">
              {RULE_LABELS[kasus.alert.ruleType as RuleType] ?? kasus.alert.ruleType}
            </p>
            <p className="font-data text-fathom mt-1 text-xs">
              {kasus.alert.lat.toFixed(4)}, {kasus.alert.lng.toFixed(4)} ·{" "}
              {formatDateTime(kasus.alert.createdAt)}
            </p>
            <span className="font-data text-signal-bright mt-2 inline-block text-xs uppercase">
              Buka alert detail →
            </span>
          </Link>

          {/* Vessel ringkas */}
          <div className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Kapal</h2>
            <div className="grid grid-cols-2 gap-3">
              <DataRow label="Nama" value={kasus.vessel.name ?? "—"} />
              <DataRow label="MMSI" value={kasus.vessel.mmsi} />
              <DataRow label="Bendera" value={kasus.vessel.flag ?? "—"} />
              <DataRow label="Tipe" value={kasus.vessel.vesselType ?? "—"} />
            </div>
            <Link
              href={`/dashboard/vessels/${kasus.vessel.id}`}
              className="font-data text-signal-bright mt-3 inline-block text-xs uppercase hover:underline"
            >
              Buka profil kapal →
            </Link>
          </div>

          {/* Attachments */}
          <div className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">
              Lampiran ({kasus.attachments.length})
            </h2>
            {kasus.attachments.length === 0 ? (
              <p className="text-mist-t text-sm">Belum ada lampiran.</p>
            ) : (
              <ul className="space-y-2">
                {kasus.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    {a.url && a.mimeType.startsWith("image/") ? (
                      <Image
                        src={a.url}
                        alt={a.fileName}
                        width={40}
                        height={40}
                        className="border-fog size-10 rounded-sm border object-cover"
                      />
                    ) : (
                      <span className="bg-deck grid size-10 place-items-center rounded-sm">
                        <FileDown className="text-fathom size-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      {a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-foam block truncate text-sm hover:underline"
                        >
                          {a.fileName}
                        </a>
                      ) : (
                        <span className="text-foam block truncate text-sm">{a.fileName}</span>
                      )}
                      <span className="font-data text-fathom text-xs">
                        {(a.sizeBytes / 1024).toFixed(0)} KB · {a.uploaderName}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
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

function TimelineEntry({
  update,
  attachments,
}: {
  update: CaseDetail["updates"][number]
  attachments: CaseDetail["attachments"]
}) {
  const icon =
    update.kind === "status_change" ? (
      <span className="bg-signal mt-1 size-2 rounded-full" />
    ) : update.kind === "handoff" ? (
      <ArrowRightLeft className="text-territory mt-0.5 size-3.5" />
    ) : update.kind === "attachment" ? (
      <Paperclip className="text-fathom mt-0.5 size-3.5" />
    ) : (
      <MessageSquare className="text-fathom mt-0.5 size-3.5" />
    )

  const attachment =
    update.kind === "attachment" && update.body
      ? attachments.find((a) => a.fileName === update.body)
      : undefined

  return (
    <li className="flex items-start gap-3">
      <span className="grid w-4 shrink-0 place-items-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-foam text-sm">
          {update.kind === "status_change" ? (
            <>
              Status <span className="font-data text-xs uppercase">{update.fromStatus}</span> →{" "}
              <span className="font-data text-signal-bright text-xs uppercase">{update.toStatus}</span>
              {update.body && <span className="text-mist-t"> — {update.body}</span>}
            </>
          ) : update.kind === "attachment" ? (
            attachment?.url ? (
              <a href={attachment.url} target="_blank" rel="noreferrer" className="hover:underline">
                Lampiran: {update.body}
              </a>
            ) : (
              <>Lampiran: {update.body}</>
            )
          ) : (
            update.body
          )}
        </div>
        <div className="font-data text-fathom text-xs">
          {update.authorName} · {formatDateTime(update.createdAt)}
        </div>
      </div>
    </li>
  )
}

function CaseSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  )
}
