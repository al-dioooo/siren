import Link from "next/link"
import { DataRow } from "@/components/shared"
import type { AlertDetail } from "../alert-types"

export function AlertPositionCard({ alert }: { alert: AlertDetail }) {
  return (
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
  )
}
