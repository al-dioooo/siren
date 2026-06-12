/** Env plumbing untuk Mapbox: token publik, style Studio, dan tileset sumber. */

export function usableEnv(value: string | undefined) {
  return Boolean(value && !value.includes("<") && !value.includes("your-") && value !== "todo")
}

export const sourceLayers = {
  wpp: process.env.NEXT_PUBLIC_MAPBOX_WPP_SOURCE_LAYER ?? "wpp_zones",
  eez: process.env.NEXT_PUBLIC_MAPBOX_EEZ_SOURCE_LAYER ?? "eez",
  mpa: process.env.NEXT_PUBLIC_MAPBOX_MPA_SOURCE_LAYER ?? "mpa",
}

export const configuredSources = {
  wpp: process.env.NEXT_PUBLIC_MAPBOX_TILESET_WPP,
  eez: process.env.NEXT_PUBLIC_MAPBOX_TILESET_EEZ,
  mpa: process.env.NEXT_PUBLIC_MAPBOX_TILESET_MPA,
}

export const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
export const hasPublicToken = usableEnv(mapboxToken) && Boolean(mapboxToken?.startsWith("pk."))
export const studioStyleUrl = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
export const hasStudioStyle = usableEnv(studioStyleUrl)
