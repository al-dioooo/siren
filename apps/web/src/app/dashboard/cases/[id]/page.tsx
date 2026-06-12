import { Suspense } from "react"
import { notFound } from "next/navigation"
import { SectionPanel } from "@/components/shared"
import { apiFetch } from "@/server/api"
import type { CaseDetail } from "@/features/cases/case-types"
import { CaseControls } from "@/features/cases/components/case-controls"
import { CaseHeader } from "@/features/cases/components/case-header"
import { CaseSkeleton } from "@/features/cases/components/case-skeleton"
import { CaseTimeline } from "@/features/cases/components/case-timeline"
import {
  CaseAttachmentsCard,
  CaseVesselCard,
  LinkedAlertCard,
} from "@/features/cases/components/case-sidebar"

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

  return (
    <div className="space-y-4">
      <CaseHeader kasus={kasus} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <SectionPanel title="Tindakan">
            <CaseControls
              caseId={kasus.id}
              agencyCode={kasus.agency.code}
              allowedTransitions={kasus.allowedTransitions}
              pdfReady
            />
          </SectionPanel>

          <SectionPanel title="Timeline">
            <CaseTimeline updates={kasus.updates} attachments={kasus.attachments} />
          </SectionPanel>
        </div>

        <div className="space-y-4">
          <LinkedAlertCard alert={kasus.alert} />
          <CaseVesselCard vessel={kasus.vessel} />
          <CaseAttachmentsCard attachments={kasus.attachments} />
        </div>
      </div>
    </div>
  )
}
