"use client"

import { Layer, Source } from "react-map-gl/mapbox"
import { MAP_COLORS } from "../map-tokens"
import type { TrackFeature } from "../map-types"

/** Track vessel terpilih — LineString violet (P3.1.4) */
export function TrackLayer({ track }: { track: TrackFeature | null }) {
  if (!track) return null

  return (
    <Source id="vessel-track" type="geojson" data={track}>
      <Layer
        id="vessel-track-line"
        type="line"
        paint={{
          "line-color": MAP_COLORS.signal,
          "line-width": 2,
          "line-opacity": 0.9,
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  )
}
