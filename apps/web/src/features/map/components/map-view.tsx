"use client"

import { useEffect, useRef } from "react"
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox"
import type { Map as MapboxMap } from "mapbox-gl"
import { parseAsBoolean, parseAsStringLiteral, useQueryState, useQueryStates } from "nuqs"
import { MAP_DEFAULT_TIME_RANGE, MAP_TIME_RANGES } from "@siren/shared/constants"
import { cn } from "@/lib/utils"
import { hasPublicToken, hasStudioStyle, mapboxToken, studioStyleUrl } from "../map-env"
import type { LayerKey } from "../map-types"
import {
  useSonarPings,
  useStudioLayerVisibility,
  useVesselClick,
  useZoneHover,
} from "../hooks/use-map-events"
import { useVesselPositions, useVesselTrack } from "../hooks/use-map-data"
import { TerritoryLayers } from "../layers/territory-layers"
import { VesselLayers } from "../layers/vessel-layers"
import { TrackLayer } from "./track-layer"
import { MapFallback } from "./map-fallback"
import { MapOverlay } from "./map-overlay"
import { VesselPopover, ZoneHoverPopup } from "./vessel-popover"

function exposeSirenMap(map: MapboxMap) {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
  if (process.env.NODE_ENV !== "production" || isLocalHost) {
    ;(window as unknown as Record<string, unknown>).__sirenMap = map
  }
}

export function MapView({ className }: { className?: string }) {
  const mapRef = useRef<MapRef>(null)

  // State layer + rentang waktu di URL (nuqs) — shareable & tahan reload (P2.1.4)
  const [mapState, setMapState] = useQueryStates({
    wpp: parseAsBoolean.withDefault(true),
    eez: parseAsBoolean.withDefault(true),
    mpa: parseAsBoolean.withDefault(true),
    vessels: parseAsBoolean.withDefault(true),
    heatmap: parseAsBoolean.withDefault(true),
    tracks: parseAsBoolean.withDefault(true),
    range: parseAsStringLiteral(MAP_TIME_RANGES).withDefault(MAP_DEFAULT_TIME_RANGE),
  })
  const [scope] = useQueryState("scope", parseAsStringLiteral(["mine", "all"] as const).withDefault("mine"))

  const layers: Record<LayerKey, boolean> = {
    wpp: mapState.wpp,
    eez: mapState.eez,
    mpa: mapState.mpa,
    vessels: mapState.vessels,
    heatmap: mapState.heatmap,
    tracks: mapState.tracks,
  }

  const pings = useSonarPings()
  const { zoneHover, handleZoneHover, clearZoneHover } = useZoneHover()
  const { selected, setSelected, handleClick } = useVesselClick()
  const vessels = useVesselPositions(mapState.range, scope)
  const track = useVesselTrack(selected, mapState.range)
  const syncStudioLayerVisibility = useStudioLayerVisibility(mapRef, layers)

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return

    let frame = 0
    let attempts = 0
    const exposeMap = () => {
      const map = mapRef.current?.getMap()
      if (map) {
        exposeSirenMap(map)
        return
      }
      attempts += 1
      if (attempts < 120) frame = requestAnimationFrame(exposeMap)
    }

    exposeMap()
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!hasPublicToken) {
    return <MapFallback className={className} reason="NEXT_PUBLIC_MAPBOX_TOKEN needs a public pk.* token" />
  }

  return (
    <div data-tour="map-lod" className={cn("border-fog bg-trench relative overflow-hidden rounded-sm border", className)}>
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{ longitude: 118, latitude: -2.3, zoom: 4.4 }}
        mapStyle={hasStudioStyle ? studioStyleUrl! : "mapbox://styles/mapbox/dark-v11"}
        style={{ position: "absolute", inset: 0 }}
        attributionControl={false}
        onLoad={(event) => {
          exposeSirenMap(event.target)
          syncStudioLayerVisibility(event.target)
        }}
        onRender={(event) => exposeSirenMap(event.target)}
        onStyleData={() => syncStudioLayerVisibility(mapRef.current?.getMap())}
        onMouseMove={handleZoneHover}
        onMouseOut={clearZoneHover}
        onClick={handleClick}
      >
        <TerritoryLayers layers={layers} />

        {layers.tracks && <TrackLayer track={track} />}

        <VesselLayers layers={layers} vessels={vessels} />

        {pings.map((ping) => (
          <Marker key={ping.key} longitude={ping.lng} latitude={ping.lat} anchor="center">
            <span className="relative grid place-items-center">
              <span className="bg-signal size-2.5 rounded-full" />
              <span className="sonar-ping absolute size-12" />
            </span>
          </Marker>
        ))}

        {zoneHover && !selected && <ZoneHoverPopup zone={zoneHover} />}

        {selected && <VesselPopover vessel={selected} onClose={() => setSelected(null)} />}

        <NavigationControl position="bottom-right" showCompass={false} />
      </Map>

      <MapOverlay
        layers={layers}
        range={mapState.range}
        vesselCount={vessels?.features.length ?? 0}
        onToggle={(key) => setMapState({ [key]: !layers[key] })}
        onRangeChange={(range) => setMapState({ range })}
      />
    </div>
  )
}
