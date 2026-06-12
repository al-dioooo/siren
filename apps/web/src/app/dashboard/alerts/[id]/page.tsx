import { Suspense } from "react"
import { notFound } from "next/navigation"
import { apiFetch } from "@/server/api"
import { getSessionOrRedirect } from "@/server/session"
import type { AlertDetail } from "@/features/alerts/alert-types"
import { AlertAuditTrail } from "@/features/alerts/components/alert-audit-trail"
import { AlertCitations } from "@/features/alerts/components/alert-citations"
import { AlertDetailSkeleton } from "@/features/alerts/components/alert-detail-skeleton"
import { AlertEvidence } from "@/features/alerts/components/alert-evidence"
import { AlertHeader } from "@/features/alerts/components/alert-header"
import { AlertPositionCard } from "@/features/alerts/components/alert-position-card"
import { ExplanationCard } from "@/features/alerts/components/explanation-card"
import { MiniMapShell } from "@/features/map/components/mini-map-shell"
import { MAP_COLORS } from "@/features/map/map-tokens"

export default function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<AlertDetailSkeleton />}>
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

  return (
    <div className="space-y-4">
      <AlertHeader alert={alert} ownAgency={user.agency?.code ?? null} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <AlertEvidence alert={alert} />
          <ExplanationCard alertId={alert.id} initialExplanation={alert.explanation} />
          <AlertCitations citations={alert.citations} />
          <AlertAuditTrail auditTrail={alert.auditTrail} />
        </div>

        <div className="space-y-4">
          <MiniMapShell
            lat={alert.lat}
            lng={alert.lng}
            severityColor={MAP_COLORS.severity[alert.severity]}
            track={alert.track}
            className="h-80 xl:h-[28rem]"
          />
          <AlertPositionCard alert={alert} />
        </div>
      </div>
    </div>
  )
}
