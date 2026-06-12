"use client"

import { Layer, Source } from "react-map-gl/mapbox"
import { MAP_COLORS } from "../map-tokens"
import { LOD, type LayerKey, type VesselCollection } from "../map-types"

const severityColorExpression = [
  "match",
  ["get", "severity"],
  "critical", MAP_COLORS.severity.critical,
  "high", MAP_COLORS.severity.high,
  "medium", MAP_COLORS.severity.medium,
  "low", MAP_COLORS.severity.low,
  /* tanpa alert aktif */ MAP_COLORS.territory,
] as const

/** Vessel markers LOD: heatmap → cluster → simbol severity (P3.1.2) */
export function VesselLayers({
  layers,
  vessels,
}: {
  layers: Record<LayerKey, boolean>
  vessels: VesselCollection | null
}) {
  if (!layers.vessels || !vessels) return null

  return (
    <Source
      id="vessels"
      type="geojson"
      data={vessels}
      cluster
      clusterMaxZoom={14}
      clusterRadius={50}
    >
      {layers.heatmap && (
        <Layer
          id="vessels-heat"
          type="heatmap"
          maxzoom={LOD.heatmapMax}
          paint={{
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, LOD.heatmapMax, 1.6],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 8, LOD.heatmapMax, 26],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(13,18,32,0)",
              0.3, "rgba(34,211,238,0.35)",
              0.6, "rgba(139,92,246,0.6)",
              1, "rgba(167,139,250,0.95)",
            ],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], LOD.heatmapMax - 1, 0.9, LOD.heatmapMax, 0],
          }}
        />
      )}
      <Layer
        id="vessels-clusters"
        type="circle"
        minzoom={LOD.clusterMin}
        filter={["has", "point_count"]}
        paint={{
          "circle-color": MAP_COLORS.signal,
          "circle-opacity": 0.75,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.3,
          "circle-stroke-width": 1,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 24],
        }}
      />
      <Layer
        id="vessels-cluster-count"
        type="symbol"
        minzoom={LOD.clusterMin}
        filter={["has", "point_count"]}
        layout={{
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
        }}
        paint={{ "text-color": "#ffffff" }}
      />
      <Layer
        id="vessels-point"
        type="circle"
        minzoom={LOD.clusterMin}
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": severityColorExpression as never,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], LOD.clusterMin, 4, LOD.symbolDetail, 7, 16, 10],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.4,
          "circle-stroke-width": 1.2,
        }}
      />
    </Source>
  )
}
