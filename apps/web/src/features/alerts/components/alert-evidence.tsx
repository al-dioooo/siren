import { DataRow, SectionPanel } from "@/components/shared"
import { formatDateTime } from "@/lib/relative-time"
import type { AlertDetail } from "../alert-types"

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

export function AlertEvidence({ alert }: { alert: AlertDetail }) {
  const vesselLabel = alert.vessel.name ?? `MMSI ${alert.vessel.mmsi}`

  return (
    <SectionPanel title="Bukti Deteksi">
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
    </SectionPanel>
  )
}
