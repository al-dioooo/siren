/**
 * Warna untuk paint properties Mapbox GL — mapbox tidak bisa membaca CSS
 * variables, jadi nilai hex token DESIGN.md §3 dicerminkan di sini.
 * Satu-satunya tempat hex peta boleh ditulis (no magic values).
 */
export const MAP_COLORS = {
  /** --territory: batas jurisdiksi (WPP/EEZ) */
  territory: "#22d3ee",
  /** --sev-critical: MPA / zona terlarang */
  mpa: "#ef4444",
  /** --signal: track kapal & sonar ping */
  signal: "#8b5cf6",
  /** severity marker kapal */
  severity: {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#60a5fa",
  },
} as const;

/** Layer id yang dipublish di style Mapbox Studio (kalau dipakai) */
export const STUDIO_LAYER_IDS = {
  wpp: ["siren-wpp"],
  eez: ["siren-eez"],
  mpa: ["siren-mpa"],
} as const;

/** Layer id lokal yang dibuat MapView sendiri (mode non-Studio) */
export const LOCAL_FILL_LAYER_IDS = {
  wpp: "wpp-fill",
  mpa: "mpa-fill",
} as const;

/**
 * Nama zona dari properti feature tileset.
 * WPP (KKP): NAMOBJ; EEZ (Marine Regions): geoname; MPA (KKP): NAMAOBJ.
 */
export function zoneNameFromFeature(props: Record<string, unknown> | null | undefined): string | null {
  if (!props) return null;
  const name = props.NAMOBJ ?? props.geoname ?? props.NAMAOBJ;
  return typeof name === "string" && name.length > 0 ? name : null;
}
