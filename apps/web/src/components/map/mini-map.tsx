"use client"

import Map, { Layer, Marker, Source } from "react-map-gl/mapbox"
import { cn } from "@/lib/utils"
import { MAP_COLORS } from "./map-tokens"

type TrackFeature = GeoJSON.Feature<GeoJSON.LineString>

/**
 * Peta mini fokus satu lokasi (plan 07 P2.2.2): marker pelanggaran + track.
 * Reuse style/token MapView; non-interaktif penuh agar ringan di halaman detail.
 */
export function MiniMap({
  lat,
  lng,
  severityColor,
  track,
  className,
}: {
  lat: number
  lng: number
  severityColor?: string
  track?: TrackFeature | null
  className?: string
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || !token.startsWith("pk.")) {
    return (
      <div className={cn("border-fog bg-trench grid place-items-center rounded-sm border", className)}>
        <span className="font-data text-fathom text-xs uppercase">Peta tidak tersedia</span>
      </div>
    )
  }

  const styleUrl = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
  const hasTrack = Boolean(track && track.geometry.coordinates.length > 1)

  return (
    <div className={cn("border-fog relative overflow-hidden rounded-sm border", className)}>
      <Map
        mapboxAccessToken={token}
        initialViewState={{ longitude: lng, latitude: lat, zoom: 8 }}
        mapStyle={styleUrl && !styleUrl.includes("<") ? styleUrl : "mapbox://styles/mapbox/dark-v11"}
        style={{ position: "absolute", inset: 0 }}
        attributionControl={false}
        dragRotate={false}
      >
        {hasTrack && (
          <Source id="mini-track" type="geojson" data={track!}>
            <Layer
              id="mini-track-line"
              type="line"
              paint={{ "line-color": MAP_COLORS.signal, "line-width": 2, "line-opacity": 0.9 }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        )}
        <Marker longitude={lng} latitude={lat} anchor="center">
          <span className="relative grid place-items-center">
            <span
              className="size-3 rounded-full shadow-[0_0_18px_currentColor]"
              style={{ background: severityColor ?? MAP_COLORS.severity.critical, color: severityColor ?? MAP_COLORS.severity.critical }}
            />
            <span className="sonar-ping absolute size-10" />
          </span>
        </Marker>
      </Map>
    </div>
  )
}
