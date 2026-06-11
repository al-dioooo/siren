"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/mapbox"
import type {
  FillLayerSpecification,
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
} from "@siren/shared"
import { Clock, Layers, Maximize2, Minus, Plus, Ship } from "lucide-react"
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

type DemoVessel = {
  id: string
  name: string
  mmsi: string
  lng: number
  lat: number
  severity: "critical" | "high" | "medium" | "low"
  rule: string
  zone: string
}

const demoVessels: DemoVessel[] = [
  {
    id: "demo-critical",
    name: "KM Samudra Raya",
    mmsi: "525021234",
    lng: 108.92,
    lat: 3.44,
    severity: "critical",
    rule: "Pelanggaran Zona",
    zone: "WPP-711",
  },
  {
    id: "demo-high",
    name: "FV Northern Light",
    mmsi: "440938120",
    lng: 117.28,
    lat: -1.72,
    severity: "high",
    rule: "AIS Gap",
    zone: "Selat Makassar",
  },
  {
    id: "demo-medium",
    name: "MT Merapi",
    mmsi: "525009812",
    lng: 130.74,
    lat: -1.13,
    severity: "medium",
    rule: "Loitering MPA",
    zone: "Raja Ampat",
  },
]

const severityMarkerClass: Record<DemoVessel["severity"], string> = {
  critical: "bg-sev-critical text-sev-critical",
  high: "bg-sev-high text-sev-high",
  medium: "bg-sev-medium text-sev-medium",
  low: "bg-sev-low text-sev-low",
}

const sourceLayers = {
  wpp: process.env.NEXT_PUBLIC_MAPBOX_WPP_SOURCE_LAYER ?? "wpp_zones",
  eez: process.env.NEXT_PUBLIC_MAPBOX_EEZ_SOURCE_LAYER ?? "eez",
  mpa: process.env.NEXT_PUBLIC_MAPBOX_MPA_SOURCE_LAYER ?? "mpa",
}

const layerKeys = ["wpp", "eez", "mpa", "vessels"] as const
type LayerKey = (typeof layerKeys)[number]

/** Layer fill yang bisa di-hover untuk tooltip nama zona (P2.1.3) */
const hoverableLayerIds = [
  LOCAL_FILL_LAYER_IDS.wpp,
  LOCAL_FILL_LAYER_IDS.mpa,
  ...STUDIO_LAYER_IDS.wpp,
  ...STUDIO_LAYER_IDS.mpa,
  ...STUDIO_LAYER_IDS.eez,
]

type ZoneHover = {
  name: string
  lng: number
  lat: number
}

function usableEnv(value: string | undefined) {
  return Boolean(value && !value.includes("<") && !value.includes("your-") && value !== "todo")
}

export function MapView({ className }: { className?: string }) {
  const mapRef = useRef<MapRef>(null)
  const [selected, setSelected] = useState<DemoVessel | null>(null)
  const [zoneHover, setZoneHover] = useState<ZoneHover | null>(null)

  // State layer + rentang waktu di URL (nuqs) — shareable & tahan reload (P2.1.4)
  const [mapState, setMapState] = useQueryStates({
    wpp: parseAsBoolean.withDefault(true),
    eez: parseAsBoolean.withDefault(true),
    mpa: parseAsBoolean.withDefault(true),
    vessels: parseAsBoolean.withDefault(true),
    range: parseAsStringLiteral(MAP_TIME_RANGES).withDefault(MAP_DEFAULT_TIME_RANGE),
  })

  const layers: Record<LayerKey, boolean> = {
    wpp: mapState.wpp,
    eez: mapState.eez,
    mpa: mapState.mpa,
    vessels: mapState.vessels,
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
        onLoad={(event) => syncStudioLayerVisibility(event.target)}
        onStyleData={() => syncStudioLayerVisibility(mapRef.current?.getMap())}
        onMouseMove={handleZoneHover}
        onMouseOut={() => setZoneHover(null)}
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

        {layers.vessels &&
          demoVessels.map((vessel) => (
            <Marker
              key={vessel.id}
              longitude={vessel.lng}
              latitude={vessel.lat}
              anchor="center"
              onClick={(event) => {
                event.originalEvent.stopPropagation()
                setSelected(vessel)
              }}
            >
              <button
                className={cn(
                  "relative grid size-5 place-items-center rounded-full border border-white/30 shadow-[0_0_22px_currentColor]",
                  severityMarkerClass[vessel.severity]
                )}
                aria-label={`Buka ${vessel.name}`}
              >
                <Ship className="size-3 text-abyss" />
                {vessel.severity === "critical" && (
                  <span className="sonar-ping absolute size-12" />
                )}
              </button>
            </Marker>
          ))}

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
            closeButton={false}
            onClose={() => setSelected(null)}
            className="siren-map-popup"
          >
            <div className="bg-trench border-mist w-60 rounded-sm border p-3 text-foam">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-sm font-semibold">{selected.name}</div>
                  <div className="font-data text-fathom text-[0.6875rem]">
                    MMSI {selected.mmsi}
                  </div>
                </div>
                <SeverityChip severity={selected.severity} />
              </div>
              <div className="text-mist-t text-xs">
                {selected.rule} · {selected.zone}
              </div>
            </div>
          </Popup>
        )}

        <NavigationControl position="bottom-right" showCompass={false} />
      </Map>

      <MapOverlay
        layers={layers}
        range={mapState.range}
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
  onToggle,
  onRangeChange,
}: {
  layers: Record<LayerKey, boolean>
  range: MapTimeRange
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
          <DataRow label="Realtime" value="Ready" />
          <DataRow label="Markers" value="Demo Layer" />
          <DataRow label="Tracks" value={MAP_TIME_RANGE_LABELS[range]} />
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
