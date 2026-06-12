"use client"

import { Popup } from "react-map-gl/mapbox"
import { SeverityChip } from "@/components/shared"
import type { SelectedVessel, ZoneHover } from "../map-types"

export function ZoneHoverPopup({ zone }: { zone: ZoneHover }) {
  return (
    <Popup
      longitude={zone.lng}
      latitude={zone.lat}
      anchor="bottom"
      offset={12}
      closeButton={false}
      closeOnClick={false}
      className="siren-map-popup pointer-events-none"
    >
      <div className="bg-trench border-mist rounded-sm border px-2.5 py-1.5">
        <span className="font-data text-foam text-xs">{zone.name}</span>
      </div>
    </Popup>
  )
}

export function VesselPopover({
  vessel,
  onClose,
}: {
  vessel: SelectedVessel
  onClose: () => void
}) {
  return (
    <Popup
      longitude={vessel.lng}
      latitude={vessel.lat}
      anchor="bottom"
      offset={10}
      closeButton={false}
      onClose={onClose}
      className="siren-map-popup"
    >
      <div className="bg-trench border-mist w-60 rounded-sm border p-3 text-foam">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-sm font-semibold">
              {vessel.name ?? "Kapal tanpa nama"}
            </div>
            <div className="font-data text-fathom text-[0.6875rem]">
              MMSI {vessel.mmsi}
              {vessel.flag ? ` · ${vessel.flag}` : ""}
            </div>
          </div>
          {vessel.severity && <SeverityChip severity={vessel.severity} />}
        </div>
        <a
          href={`/dashboard/vessels/${encodeURIComponent(vessel.vesselId)}`}
          className="bg-signal/15 text-signal-bright hover:bg-signal/25 font-data block rounded-sm px-2 py-1.5 text-center text-xs uppercase transition-colors"
        >
          Buka detail
        </a>
      </div>
    </Popup>
  )
}
