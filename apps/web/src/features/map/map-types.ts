import type { Severity } from "@siren/shared/constants"

export const layerKeys = ["wpp", "eez", "mpa", "vessels", "heatmap", "tracks"] as const
export type LayerKey = (typeof layerKeys)[number]

/** Zoom threshold LOD (plan 03 Stage 3): heatmap 0–6, cluster 6+, simbol detail 11+ */
export const LOD = { heatmapMax: 6, clusterMin: 6, symbolDetail: 11 } as const

export type ZoneHover = { name: string; lng: number; lat: number }

export type SelectedVessel = {
  vesselId: string
  name: string | null
  mmsi: string
  flag: string | null
  severity: Severity | null
  lng: number
  lat: number
}

export type VesselCollection = GeoJSON.FeatureCollection<GeoJSON.Point>
export type TrackFeature = GeoJSON.Feature<GeoJSON.LineString>
