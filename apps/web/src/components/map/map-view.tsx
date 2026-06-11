"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, {
  Layer,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox"
import type {
  FillLayerSpecification,
  GeoJSONSource,
  LineLayerSpecification,
  MapMouseEvent,
  Map as MapboxMap,
} from "mapbox-gl"
import { parseAsBoolean, parseAsStringLiteral, useQueryStates } from "nuqs"
import {
  MAP_DEFAULT_TIME_RANGE,
  MAP_TIME_RANGES,
  MAP_TIME_RANGE_LABELS,
  type MapTimeRange,
  type Severity,
} from "@siren/shared"
import { Clock, Layers, Maximize2, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataRow, SeverityChip } from "@/components/siren"
import { cn } from "@/lib/utils"
import {
  LOCAL_FILL_LAYER_IDS,
  MAP_COLORS,
  STUDIO_LAYER_IDS,
  zoneNameFromFeature,
} from "./map-tokens"

const sourceLayers = {
  wpp: process.env.NEXT_PUBLIC_MAPBOX_WPP_SOURCE_LAYER ?? "wpp_zones",
  eez: process.env.NEXT_PUBLIC_MAPBOX_EEZ_SOURCE_LAYER ?? "eez",
  mpa: process.env.NEXT_PUBLIC_MAPBOX_MPA_SOURCE_LAYER ?? "mpa",
}

const layerKeys = ["wpp", "eez", "mpa", "vessels", "heatmap", "tracks"] as const
type LayerKey = (typeof layerKeys)[number]

/** Zoom threshold LOD (plan 03 Stage 3): heatmap 0–6, cluster 6+, simbol detail 11+ */
const LOD = { heatmapMax: 6, clusterMin: 6, symbolDetail: 11 } as const

/** Layer fill yang bisa di-hover untuk tooltip nama zona (P2.1.3) */
const hoverableLayerIds = [
  LOCAL_FILL_LAYER_IDS.wpp,
  LOCAL_FILL_LAYER_IDS.mpa,
  ...STUDIO_LAYER_IDS.wpp,
  ...STUDIO_LAYER_IDS.mpa,
  ...STUDIO_LAYER_IDS.eez,
]

type ZoneHover = { name: string; lng: number; lat: number }

type SelectedVessel = {
  vesselId: string
  name: string | null
  mmsi: string
  flag: string | null
  severity: Severity | null
  lng: number
  lat: number
}

type VesselCollection = GeoJSON.FeatureCollection<GeoJSON.Point>
type TrackFeature = GeoJSON.Feature<GeoJSON.LineString>

const severityColorExpression = [
  "match",
  ["get", "severity"],
  "critical", MAP_COLORS.severity.critical,
  "high", MAP_COLORS.severity.high,
  "medium", MAP_COLORS.severity.medium,
  "low", MAP_COLORS.severity.low,
  /* tanpa alert aktif */ MAP_COLORS.territory,
] as const

function usableEnv(value: string | undefined) {
  return Boolean(value && !value.includes("<") && !value.includes("your-") && value !== "todo")
}

export function MapView({ className }: { className?: string }) {
  const mapRef = useRef<MapRef>(null)
  const [zoneHover, setZoneHover] = useState<ZoneHover | null>(null)
  const [selected, setSelected] = useState<SelectedVessel | null>(null)
  const [vessels, setVessels] = useState<VesselCollection | null>(null)
  const [track, setTrack] = useState<TrackFeature | null>(null)

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

  const layers: Record<LayerKey, boolean> = {
    wpp: mapState.wpp,
    eez: mapState.eez,
    mpa: mapState.mpa,
    vessels: mapState.vessels,
    heatmap: mapState.heatmap,
    tracks: mapState.tracks,
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const hasPublicToken = usableEnv(token) && token?.startsWith("pk.")
  const studioStyleUrl = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
  const hasStudioStyle = usableEnv(studioStyleUrl)

  const configuredSources = useMemo(
    () => ({
      wpp: process.env.NEXT_PUBLIC_MAPBOX_TILESET_WPP,
      eez: process.env.NEXT_PUBLIC_MAPBOX_TILESET_EEZ,
      mpa: process.env.NEXT_PUBLIC_MAPBOX_TILESET_MPA,
    }),
    []
  )

  // Posisi terakhir per vessel sesuai rentang waktu (P3.1.1)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/v1/map/vessels?since=${mapState.range}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VesselCollection | null) => {
        if (!cancelled && data) setVessels(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [mapState.range])

  // Ganti vessel → track lama dibersihkan, fetch track baru (P3.1.4)
  useEffect(() => {
    setTrack(null)
    if (!selected) return
    let cancelled = false
    fetch(`/api/v1/vessels/${encodeURIComponent(selected.vesselId)}/track?since=${mapState.range}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TrackFeature | null) => {
        if (!cancelled && data && data.geometry.coordinates.length > 1) setTrack(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selected, mapState.range])

  const syncStudioLayerVisibility = useCallback(
    (map: MapboxMap | null | undefined) => {
      if (!hasStudioStyle || !map) {
        return
      }

      for (const [key, ids] of Object.entries(STUDIO_LAYER_IDS)) {
        const visibility = layers[key as keyof typeof STUDIO_LAYER_IDS] ? "visible" : "none"
        for (const id of ids) {
          if (map.getLayer(id)) {
            map.setLayoutProperty(id, "visibility", visibility)
          }
        }
      }
    },
    [hasStudioStyle, layers.wpp, layers.eez, layers.mpa]
  )

  useEffect(() => {
    syncStudioLayerVisibility(mapRef.current?.getMap())
  }, [syncStudioLayerVisibility])

  const handleZoneHover = useCallback((event: MapMouseEvent) => {
    const map = event.target
    // Marker kapal lebih prioritas dari zona
    const vesselLayers = ["vessels-point", "vessels-clusters"].filter((id) => map.getLayer(id))
    if (vesselLayers.length > 0 && map.queryRenderedFeatures(event.point, { layers: vesselLayers }).length > 0) {
      map.getCanvas().style.cursor = "pointer"
      setZoneHover(null)
      return
    }
    const presentLayers = hoverableLayerIds.filter((id) => map.getLayer(id))
    if (presentLayers.length === 0) {
      return
    }
    const feature = map.queryRenderedFeatures(event.point, { layers: presentLayers })[0]
    const name = zoneNameFromFeature(feature?.properties)
    if (name) {
      map.getCanvas().style.cursor = "crosshair"
      setZoneHover({ name, lng: event.lngLat.lng, lat: event.lngLat.lat })
    } else {
      map.getCanvas().style.cursor = ""
      setZoneHover(null)
    }
  }, [])

  const handleClick = useCallback((event: MapMouseEvent) => {
    const map = event.target
    const layersPresent = ["vessels-clusters", "vessels-point"].filter((id) => map.getLayer(id))
    if (layersPresent.length === 0) return
    const feature = map.queryRenderedFeatures(event.point, { layers: layersPresent })[0]
    if (!feature) {
      setSelected(null)
      return
    }

    if (feature.layer?.id === "vessels-clusters") {
      // Klik cluster → zoom expand (P3.1.3)
      const clusterId = feature.properties?.cluster_id as number | undefined
      const source = map.getSource("vessels") as GeoJSONSource | undefined
      if (clusterId !== undefined && source) {
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return
          const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates
          map.easeTo({ center: [lng!, lat!], zoom: (zoom ?? map.getZoom() + 2) + 0.5 })
        })
      }
      return
    }

    const props = feature.properties as Record<string, unknown>
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates
    setSelected({
      vesselId: String(props.vesselId),
      name: (props.name as string | null) ?? null,
      mmsi: String(props.mmsi ?? "?"),
      flag: (props.flag as string | null) ?? null,
      severity: (props.severity as Severity | null) ?? null,
      lng: lng!,
      lat: lat!,
    })
  }, [])

  if (!hasPublicToken) {
    return <MapFallback className={className} reason="NEXT_PUBLIC_MAPBOX_TOKEN needs a public pk.* token" />
  }

  return (
    <div className={cn("border-fog bg-trench relative overflow-hidden rounded-sm border", className)}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={{ longitude: 118, latitude: -2.3, zoom: 4.4 }}
        mapStyle={hasStudioStyle ? studioStyleUrl! : "mapbox://styles/mapbox/dark-v11"}
        style={{ position: "absolute", inset: 0 }}
        attributionControl={false}
        onLoad={(event) => {
          if (process.env.NODE_ENV !== "production") {
            ;(window as unknown as Record<string, unknown>).__sirenMap = event.target
          }
          syncStudioLayerVisibility(event.target)
        }}
        onStyleData={() => syncStudioLayerVisibility(mapRef.current?.getMap())}
        onMouseMove={handleZoneHover}
        onMouseOut={() => setZoneHover(null)}
        onClick={handleClick}
      >
        {!hasStudioStyle && layers.wpp && usableEnv(configuredSources.wpp) && (
          <TerritorySource
            id="wpp"
            url={configuredSources.wpp!}
            sourceLayer={sourceLayers.wpp}
            fillLayer={{
              id: LOCAL_FILL_LAYER_IDS.wpp,
              type: "fill",
              paint: {
                "fill-color": MAP_COLORS.territory,
                "fill-opacity": 0.08,
              },
            }}
            lineLayer={{
              id: "wpp-outline",
              type: "line",
              paint: {
                "line-color": MAP_COLORS.territory,
                "line-opacity": 0.82,
                "line-width": 1.2,
              },
            }}
          />
        )}

        {!hasStudioStyle && layers.eez && usableEnv(configuredSources.eez) && (
          <TerritorySource
            id="eez"
            url={configuredSources.eez!}
            sourceLayer={sourceLayers.eez}
            lineLayer={{
              id: "eez-outline",
              type: "line",
              paint: {
                "line-color": MAP_COLORS.territory,
                "line-dasharray": [2, 2],
                "line-opacity": 0.75,
                "line-width": 1.1,
              },
            }}
          />
        )}

        {!hasStudioStyle && layers.mpa && usableEnv(configuredSources.mpa) && (
          <TerritorySource
            id="mpa"
            url={configuredSources.mpa!}
            sourceLayer={sourceLayers.mpa}
            fillLayer={{
              id: LOCAL_FILL_LAYER_IDS.mpa,
              type: "fill",
              paint: {
                "fill-color": MAP_COLORS.mpa,
                "fill-opacity": 0.12,
              },
            }}
            lineLayer={{
              id: "mpa-outline",
              type: "line",
              paint: {
                "line-color": MAP_COLORS.mpa,
                "line-opacity": 0.65,
                "line-width": 1,
              },
            }}
          />
        )}

        {/* Track vessel terpilih — LineString violet (P3.1.4) */}
        {layers.tracks && track && (
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
        )}

        {/* Vessel markers LOD: heatmap → cluster → simbol severity (P3.1.2) */}
        {layers.vessels && vessels && (
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
        )}

        {zoneHover && !selected && (
          <Popup
            longitude={zoneHover.lng}
            latitude={zoneHover.lat}
            anchor="bottom"
            offset={12}
            closeButton={false}
            closeOnClick={false}
            className="siren-map-popup pointer-events-none"
          >
            <div className="bg-trench border-mist rounded-sm border px-2.5 py-1.5">
              <span className="font-data text-foam text-xs">{zoneHover.name}</span>
            </div>
          </Popup>
        )}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="bottom"
            offset={10}
            closeButton={false}
            onClose={() => setSelected(null)}
            className="siren-map-popup"
          >
            <div className="bg-trench border-mist w-60 rounded-sm border p-3 text-foam">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-sm font-semibold">
                    {selected.name ?? "Kapal tanpa nama"}
                  </div>
                  <div className="font-data text-fathom text-[0.6875rem]">
                    MMSI {selected.mmsi}
                    {selected.flag ? ` · ${selected.flag}` : ""}
                  </div>
                </div>
                {selected.severity && <SeverityChip severity={selected.severity} />}
              </div>
              <a
                href={`/dashboard/vessels/${encodeURIComponent(selected.vesselId)}`}
                className="bg-signal/15 text-signal-bright hover:bg-signal/25 font-data block rounded-sm px-2 py-1.5 text-center text-xs uppercase transition-colors"
              >
                Buka detail
              </a>
            </div>
          </Popup>
        )}

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

function TerritorySource({
  id,
  url,
  sourceLayer,
  fillLayer,
  lineLayer,
}: {
  id: string
  url: string
  sourceLayer: string
  fillLayer?: Omit<FillLayerSpecification, "source" | "source-layer">
  lineLayer?: Omit<LineLayerSpecification, "source" | "source-layer">
}) {
  const fillSpec = fillLayer
    ? ({
        ...fillLayer,
        source: id,
        "source-layer": sourceLayer,
      } satisfies FillLayerSpecification)
    : null
  const lineSpec = lineLayer
    ? ({
        ...lineLayer,
        source: id,
        "source-layer": sourceLayer,
      } satisfies LineLayerSpecification)
    : null

  return (
    <Source id={id} type="vector" url={url}>
      {fillSpec && <Layer {...fillSpec} />}
      {lineSpec && <Layer {...lineSpec} />}
    </Source>
  )
}

function MapOverlay({
  layers,
  range,
  vesselCount,
  onToggle,
  onRangeChange,
}: {
  layers: Record<LayerKey, boolean>
  range: MapTimeRange
  vesselCount: number
  onToggle: (key: LayerKey) => void
  onRangeChange: (range: MapTimeRange) => void
}) {
  return (
    <>
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Clock className="size-4" />
            {MAP_TIME_RANGE_LABELS[range]}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {MAP_TIME_RANGES.map((value) => (
              <DropdownMenuItem
                key={value}
                onSelect={() => onRangeChange(value)}
                className={cn(value === range && "text-signal-bright")}
              >
                {MAP_TIME_RANGE_LABELS[value]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {layerKeys.map((key) => (
          <Button
            key={key}
            variant={layers[key] ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(key)}
          >
            <Layers className="size-4" />
            {key.toUpperCase()}
          </Button>
        ))}
      </div>

      <div className="bg-trench/95 border-mist absolute bottom-4 left-4 w-[min(360px,calc(100%-2rem))] rounded-sm border p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold">Command Center</h1>
            <p className="text-mist-t text-sm">Viewport operasional Indonesia</p>
          </div>
          <SeverityChip severity="critical" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DataRow label="Primary Zone" value="WPP-711" />
          <DataRow label="Vessels" value={String(vesselCount)} />
          <DataRow label="Window" value={MAP_TIME_RANGE_LABELS[range]} />
          <DataRow label="Tracks" value={layers.tracks ? "On" : "Off"} />
        </div>
      </div>
    </>
  )
}

function MapFallback({ className, reason }: { className?: string; reason: string }) {
  return (
    <div className={cn("border-fog bg-trench relative overflow-hidden rounded-sm border", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(34_211_238_/_0.08)_1px,transparent_1px),linear-gradient(rgb(34_211_238_/_0.08)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_42%,rgb(34_211_238_/_0.12),transparent_34%)]" />
      <div className="absolute left-[18%] top-[22%] h-32 w-52 rotate-[-18deg] rounded-[45%] border border-territory/50 bg-territory/5" />
      <div className="absolute right-[18%] top-[36%] h-44 w-64 rotate-[12deg] rounded-[44%] border border-territory/40 bg-territory/5" />
      <div className="absolute bottom-[18%] left-[38%] h-36 w-56 rotate-[22deg] rounded-[45%] border border-territory/35 bg-territory/5" />

      <FallbackMarker className="left-[34%] top-[36%]" severity="critical" />
      <FallbackMarker className="right-[31%] top-[48%]" severity="high" />
      <FallbackMarker className="bottom-[28%] left-[48%]" severity="medium" />

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <Layers className="size-4" />
          WPP / ZEE / MPA
        </Button>
        <Button variant="outline" size="sm">
          <Clock className="size-4" />
          24 Jam
        </Button>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Perbesar peta">
          <Plus className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Perkecil peta">
          <Minus className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Layar penuh">
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <div className="bg-trench/95 border-mist absolute bottom-4 left-4 w-[min(420px,calc(100%-2rem))] rounded-sm border p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold">Command Center</h1>
            <p className="text-mist-t text-sm">Mapbox fallback active</p>
          </div>
          <SeverityChip severity="critical" />
        </div>
        <p className="text-mist-t mb-4 text-sm">{reason}</p>
        <div className="grid grid-cols-2 gap-3">
          <DataRow label="Primary Zone" value="WPP-711" />
          <DataRow label="Realtime" value="Pending" />
          <DataRow label="Markers" value="Fallback" />
          <DataRow label="Tracks" value="24h Window" />
        </div>
      </div>
    </div>
  )
}

function FallbackMarker({
  severity,
  className,
}: {
  severity: "critical" | "high" | "medium"
  className: string
}) {
  const color =
    severity === "critical"
      ? "bg-sev-critical"
      : severity === "high"
        ? "bg-sev-high"
        : "bg-sev-medium"

  return (
    <div className={`absolute ${className}`}>
      <span className={`block size-3 rounded-full ${color} shadow-[0_0_24px_currentColor]`} />
      {severity === "critical" && <span className="sonar-ping absolute -left-3 -top-3 size-9" />}
    </div>
  )
}
