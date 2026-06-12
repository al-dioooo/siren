import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RULE_LABELS, type AlertStatus, type RuleType, type Severity } from "@siren/shared/constants"
import { DataRow, EmptyText, SectionPanel, SeverityChip, StatusBadge } from "@/components/shared"
import { MiniMapShell } from "@/features/map/components/mini-map-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/server/api"
import { formatDateTime, relativeTime } from "@/lib/relative-time"

type VesselDetail = {
  id: string
  mmsi: string
  imo: string | null
  name: string | null
  flag: string | null
  vesselType: string | null
  gfwVesselId: string | null
  licensedWpp: { zoneId: string; name: string } | null
  lastPosition: { lat: number; lng: number; timestamp: string; sog: number | null } | null
  positionCount: number
  alerts: Array<{
    id: string
    ruleType: string
    severity: Severity
    status: AlertStatus
    agencyCode: string | null
    createdAt: string
  }>
}

type TrackFeature = GeoJSON.Feature<GeoJSON.LineString>

export default function VesselDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<VesselSkeleton />}>
      <VesselDetailContent params={params} />
    </Suspense>
  )
}

async function VesselDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await apiFetch(`/api/v1/vessels/${encodeURIComponent(id)}`)
  if (res.status === 404) notFound()
  if (!res.ok) throw new Error(`Vessel detail gagal dimuat: HTTP ${res.status}`)
  const vessel = (await res.json()) as VesselDetail

  // Track 7 hari untuk mini-map (reuse endpoint plan 03)
  const trackRes = await apiFetch(`/api/v1/vessels/${encodeURIComponent(id)}/track?since=7d`)
  const track = trackRes.ok ? ((await trackRes.json()) as TrackFeature) : null

  return (
    <div className="space-y-4">
      <header className="border-fog bg-trench rounded-sm border p-4">
        <h1 className="font-display text-xl font-semibold">{vessel.name ?? `MMSI ${vessel.mmsi}`}</h1>
        <p className="font-data text-fathom text-sm">
          MMSI {vessel.mmsi}
          {vessel.flag ? ` · ${vessel.flag}` : ""}
          {vessel.vesselType ? ` · ${vessel.vesselType}` : ""}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          {/* Identity card */}
          <SectionPanel title="Identitas">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <DataRow label="MMSI" value={vessel.mmsi} />
              <DataRow label="IMO" value={vessel.imo ?? "—"} />
              <DataRow label="Bendera" value={vessel.flag ?? "—"} />
              <DataRow label="Tipe" value={vessel.vesselType ?? "—"} />
              <DataRow
                label="Izin WPP"
                value={vessel.licensedWpp ? vessel.licensedWpp.zoneId : "Tidak ada"}
              />
              <DataRow label="Titik Posisi" value={String(vessel.positionCount)} />
              {vessel.lastPosition && (
                <>
                  <DataRow
                    label="Posisi Terakhir"
                    value={`${vessel.lastPosition.lat.toFixed(4)}, ${vessel.lastPosition.lng.toFixed(4)}`}
                  />
                  <DataRow label="Terlihat" value={relativeTime(vessel.lastPosition.timestamp)} />
                  <DataRow
                    label="SOG"
                    value={vessel.lastPosition.sog != null ? `${vessel.lastPosition.sog.toFixed(1)} kn` : "—"}
                  />
                </>
              )}
            </div>
          </SectionPanel>

          {/* Riwayat alert */}
          <SectionPanel title={`Riwayat Alert (${vessel.alerts.length})`}>
            {vessel.alerts.length === 0 ? (
              <EmptyText>Tidak ada alert untuk kapal ini.</EmptyText>
            ) : (
              <ul className="divide-fog divide-y">
                {vessel.alerts.map((a) => (
                  <li key={a.id} className="relative">
                    <Link
                      href={`/dashboard/alerts/${a.id}`}
                      className="hover:bg-deck/60 flex flex-wrap items-center justify-between gap-2 p-3 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <SeverityChip severity={a.severity} />
                        <span className="text-foam text-sm">
                          {RULE_LABELS[a.ruleType as RuleType] ?? a.ruleType}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {a.agencyCode && (
                          <span className="border-territory/40 text-territory font-data rounded-sm border px-1.5 py-0.5 text-[0.625rem] uppercase">
                            {a.agencyCode}
                          </span>
                        )}
                        <StatusBadge status={a.status} />
                        <span className="font-data text-fathom text-xs">{formatDateTime(a.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </div>

        {/* Track mini-map — empty state ramah saat tanpa posisi (Test 1.2) */}
        <div className="space-y-4">
          {vessel.lastPosition ? (
            <MiniMapShell
              lat={vessel.lastPosition.lat}
              lng={vessel.lastPosition.lng}
              track={track}
              className="h-80 xl:h-[28rem]"
            />
          ) : (
            <div className="border-fog bg-trench grid h-80 place-items-center rounded-sm border">
              <p className="text-mist-t text-sm">Belum ada data posisi untuk kapal ini.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function VesselSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
