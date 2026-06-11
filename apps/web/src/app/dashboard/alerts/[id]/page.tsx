import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ExternalLink } from "lucide-react"
import { RULE_LABELS, type AlertStatus, type RuleType, type Severity } from "@siren/shared"
import { DataRow, SeverityChip, StatusBadge } from "@/components/siren"
import { MiniMapShell } from "@/components/map/mini-map-shell"
import { MAP_COLORS } from "@/components/map/map-tokens"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/server/api"
import { getSessionOrRedirect } from "@/server/session"
import { formatDateTime, relativeTime } from "@/lib/relative-time"
import { AlertActionBar } from "./action-bar"
import { ExplanationCard } from "./explanation-card"

type AlertDetail = {
  id: string
  ruleType: string
  severity: Severity
  status: AlertStatus
  lat: number
  lng: number
  evidenceJson: Record<string, unknown>
  explanation: string | null
  createdAt: string
  vessel: {
    id: string
    mmsi: string
    imo: string | null
    name: string | null
    flag: string | null
    vesselType: string | null
  }
  agency: { id: string; code: string; name: string } | null
  wppZone: { zoneId: string; name: string } | null
  case: { id: string; caseCode: string; status: string } | null
  citations: Array<{ lawRef: string; title: string; body: string; sourceUrl: string }>
  track: GeoJSON.Feature<GeoJSON.LineString>
  auditTrail: Array<{
    id: string
    action: string
    actorName: string | null
    metaJson: Record<string, unknown>
    createdAt: string
  }>
}

const AUDIT_LABELS: Record<string, string> = {
  "alert.dispatch": "Alert di-dispatch",
  "alert.escalate": "Alert dieskalasi",
  "alert.false_positive": "Ditandai false positive",
}

const EVIDENCE_LABELS: Record<string, string> = {
  gapHours: "Durasi Gap (jam)",
  wppZone: "Zona WPP",
  licensedWpp: "WPP Berizin",
  mpaName: "Kawasan Konservasi",
  durationMinutes: "Durasi (menit)",
  durationHours: "Durasi (jam)",
  distanceMeters: "Jarak (meter)",
  otherVesselMmsi: "MMSI Kapal Lawan",
  avgSog: "Kecepatan Rata-rata (kn)",
  vesselType: "Tipe Kapal",
  flag: "Bendera",
  lastSeenAt: "Terakhir Terlihat",
  reappearedAt: "Muncul Kembali",
}

function humanizeKey(key: string): string {
  return (
    EVIDENCE_LABELS[key] ??
    key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^\w/, (ch) => ch.toUpperCase())
  )
}

function formatEvidenceValue(value: unknown): string {
  if (value == null) return "—"
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(2)
  if (typeof value === "string") {
    // ISO timestamp → format lokal
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
    return value
  }
  if (typeof value === "boolean") return value ? "Ya" : "Tidak"
  return JSON.stringify(value)
}

export default function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AlertDetailContent params={params} />
    </Suspense>
  )
}

async function AlertDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [user, res] = await Promise.all([
    getSessionOrRedirect(),
    apiFetch(`/api/v1/alerts/${encodeURIComponent(id)}`),
  ])
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`Alert detail gagal dimuat: HTTP ${res.status}`)
  const alert = (await res.json()) as AlertDetail

  const vesselLabel = alert.vessel.name ?? `MMSI ${alert.vessel.mmsi}`

  return (
    <div className="space-y-4">
      {/* Header */}
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
            ownAgency={user.agency?.code ?? null}
            alertAgencyCode={alert.agency?.code ?? null}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          {/* Evidence */}
          <section className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Bukti Deteksi</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <DataRow label="Kapal" value={vesselLabel} />
              <DataRow label="MMSI" value={alert.vessel.mmsi} />
              <DataRow label="Bendera" value={alert.vessel.flag ?? "—"} />
              <DataRow label="Tipe" value={alert.vessel.vesselType ?? "—"} />
              <DataRow label="Koordinat" value={`${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}`} />
              <DataRow label="Zona" value={alert.wppZone ? `${alert.wppZone.zoneId}` : "—"} />
              {Object.entries(alert.evidenceJson).map(([key, value]) => (
                <DataRow key={key} label={humanizeKey(key)} value={formatEvidenceValue(value)} />
              ))}
            </div>
          </section>

          {/* AI Explanation */}
          <ExplanationCard alertId={alert.id} initialExplanation={alert.explanation} />

          {/* Citations */}
          <section className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Dasar Hukum</h2>
            {alert.citations.length === 0 ? (
              <p className="text-mist-t text-sm">Tidak ada kutipan pasal untuk rule ini.</p>
            ) : (
              <div className="space-y-2">
                {alert.citations.map((ct) => (
                  <details key={ct.lawRef} className="border-fog group rounded-sm border">
                    <summary className="hover:bg-deck/60 flex cursor-pointer items-center justify-between gap-2 p-3">
                      <span>
                        <span className="font-data text-signal-bright text-xs uppercase">{ct.lawRef}</span>
                        <span className="text-foam block text-sm">{ct.title}</span>
                      </span>
                      <span className="text-fathom text-xs group-open:rotate-180">▾</span>
                    </summary>
                    <div className="border-fog border-t p-3">
                      <p className="text-mist-t text-sm leading-relaxed whitespace-pre-line">{ct.body}</p>
                      <a
                        href={ct.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-data text-signal-bright mt-2 inline-flex items-center gap-1 text-xs uppercase hover:underline"
                      >
                        Sumber <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          {/* Audit timeline (P1 — P2.2.5) */}
          <section className="border-fog bg-trench rounded-sm border p-4">
            <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Aktivitas</h2>
            {alert.auditTrail.length === 0 ? (
              <p className="text-mist-t text-sm">Belum ada aksi pada alert ini.</p>
            ) : (
              <ol className="space-y-3">
                {alert.auditTrail.map((entry) => (
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
          </section>
        </div>

        {/* Mini map */}
        <div className="space-y-4">
          <MiniMapShell
            lat={alert.lat}
            lng={alert.lng}
            severityColor={MAP_COLORS.severity[alert.severity]}
            track={alert.track}
            className="h-80 xl:h-[28rem]"
          />
          <div className="border-fog bg-trench rounded-sm border p-4">
            <div className="grid grid-cols-2 gap-3">
              <DataRow label="Lintang" value={alert.lat.toFixed(5)} />
              <DataRow label="Bujur" value={alert.lng.toFixed(5)} />
              <DataRow label="Track 24 Jam" value={`${alert.track.properties?.pointCount ?? 0} titik`} />
              <DataRow
                label="Vessel"
                value={
                  <Link href={`/dashboard/vessels/${alert.vessel.id}`} className="hover:underline">
                    Buka profil →
                  </Link>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
