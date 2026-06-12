import type { AlertStatus, CaseStatus, Severity } from "@siren/shared/constants"

export type CaseDetail = {
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
