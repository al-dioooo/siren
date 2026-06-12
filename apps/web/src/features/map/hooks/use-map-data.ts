"use client"

import { useEffect, useState } from "react"
import type { MapTimeRange } from "@siren/shared/constants"
import type { SelectedVessel, TrackFeature, VesselCollection } from "../map-types"

/** Posisi terakhir per vessel sesuai rentang waktu (P3.1.1) */
export function useVesselPositions(range: MapTimeRange, scope: "mine" | "all") {
  const [vessels, setVessels] = useState<VesselCollection | null>(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ since: range, scope })
    fetch(`/api/v1/map/vessels?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VesselCollection | null) => {
        if (!cancelled && data) setVessels(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [range, scope])

  return vessels
}

/** Ganti vessel → track lama dibersihkan, fetch track baru (P3.1.4) */
export function useVesselTrack(selected: SelectedVessel | null, range: MapTimeRange) {
  // Track disimpan bersama identitas request-nya; saat vessel/range berganti,
  // key tidak cocok → track lama langsung tersembunyi tanpa setState sinkron.
  const [result, setResult] = useState<{ key: string; track: TrackFeature } | null>(null)
  const key = selected ? `${selected.vesselId}:${range}` : ""

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    fetch(`/api/v1/vessels/${encodeURIComponent(selected.vesselId)}/track?since=${range}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TrackFeature | null) => {
        if (!cancelled && data && data.geometry.coordinates.length > 1)
          setResult({ key: `${selected.vesselId}:${range}`, track: data })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selected, range])

  return result && result.key === key ? result.track : null
}
