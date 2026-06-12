"use client"

import { useCallback, useEffect, useState, type RefObject } from "react"
import type { MapRef } from "react-map-gl/mapbox"
import type { GeoJSONSource, MapMouseEvent, Map as MapboxMap } from "mapbox-gl"
import type { Severity } from "@siren/shared/constants"
import { RT_ALERT_EVENT, type RtAlertDetail } from "@/lib/realtime-events"
import { LOCAL_FILL_LAYER_IDS, STUDIO_LAYER_IDS, zoneNameFromFeature } from "../map-tokens"
import { hasStudioStyle } from "../map-env"
import type { LayerKey, SelectedVessel, ZoneHover } from "../map-types"

/** Layer fill yang bisa di-hover untuk tooltip nama zona (P2.1.3) */
const hoverableLayerIds = [
  LOCAL_FILL_LAYER_IDS.wpp,
  LOCAL_FILL_LAYER_IDS.mpa,
  ...STUDIO_LAYER_IDS.wpp,
  ...STUDIO_LAYER_IDS.mpa,
  ...STUDIO_LAYER_IDS.eez,
]

const PING_LIFETIME_MS = 1_500

/**
 * Sonar ping event-driven dari AlertLiveSubscriber (plan 03 P4.2.2):
 * render riak violet ~1.2s di koordinat alert, lalu elemen dihapus
 */
export function useSonarPings() {
  const [pings, setPings] = useState<Array<RtAlertDetail & { key: number }>>([])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<RtAlertDetail>).detail
      const key = Date.now()
      setPings((current) => [...current, { ...detail, key }])
      setTimeout(
        () => setPings((current) => current.filter((p) => p.key !== key)),
        PING_LIFETIME_MS
      )
    }
    window.addEventListener(RT_ALERT_EVENT, handler)
    return () => window.removeEventListener(RT_ALERT_EVENT, handler)
  }, [])

  return pings
}

/** Sinkronkan visibilitas layer Studio dengan state toggle layer (hanya saat style Studio aktif). */
export function useStudioLayerVisibility(
  mapRef: RefObject<MapRef | null>,
  layers: Record<LayerKey, boolean>
) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya sub-key teritori yang relevan
    [layers.wpp, layers.eez, layers.mpa]
  )

  useEffect(() => {
    syncStudioLayerVisibility(mapRef.current?.getMap())
  }, [syncStudioLayerVisibility, mapRef])

  return syncStudioLayerVisibility
}

/** Hover zona → tooltip nama; marker kapal lebih prioritas dari zona. */
export function useZoneHover() {
  const [zoneHover, setZoneHover] = useState<ZoneHover | null>(null)

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

  const clearZoneHover = useCallback(() => setZoneHover(null), [])

  return { zoneHover, handleZoneHover, clearZoneHover }
}

/** Klik kapal → pilih; klik cluster → zoom expand (P3.1.3). */
export function useVesselClick() {
  const [selected, setSelected] = useState<SelectedVessel | null>(null)

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

  return { selected, setSelected, handleClick }
}
