import type { AlertStatus, Severity } from "@siren/shared/constants"

export type AlertDetail = {
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
