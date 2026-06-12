"use client"

import { Layer, Source } from "react-map-gl/mapbox"
import type { FillLayerSpecification, LineLayerSpecification } from "mapbox-gl"
import { LOCAL_FILL_LAYER_IDS, MAP_COLORS } from "../map-tokens"
import { configuredSources, hasStudioStyle, sourceLayers, usableEnv } from "../map-env"
import type { LayerKey } from "../map-types"

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

/** Zona teritori WPP/ZEE/MPA dari tileset lokal — hanya saat tidak memakai style Studio. */
export function TerritoryLayers({ layers }: { layers: Record<LayerKey, boolean> }) {
  if (hasStudioStyle) return null

  return (
    <>
      {layers.wpp && usableEnv(configuredSources.wpp) && (
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

      {layers.eez && usableEnv(configuredSources.eez) && (
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

      {layers.mpa && usableEnv(configuredSources.mpa) && (
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
    </>
  )
}
