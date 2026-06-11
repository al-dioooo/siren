// FALLBACK: poligon kotak kasar per WPP — dipakai HANYA kalau
// prisma/data/wpp.geojson (boundary asli) belum tersedia.
// Cukup untuk menggerakkan trigger wpp_zone_id + rules saat dev;
// GANTI dengan GeoJSON asli (sama dengan tileset Mapbox) sebelum demo
// supaya batas di DB = batas di peta.

type Box = { zoneId: string; name: string; bbox: [number, number, number, number] }; // [minLng, minLat, maxLng, maxLat]

export const WPP_FALLBACK: Box[] = [
  { zoneId: 'WPP-571', name: 'Selat Malaka dan Laut Andaman', bbox: [95, 1, 103, 8] },
  { zoneId: 'WPP-572', name: 'Samudra Hindia Barat Sumatera dan Selat Sunda', bbox: [93, -10, 105, 1] },
  { zoneId: 'WPP-573', name: 'Samudra Hindia Selatan Jawa hingga NTT', bbox: [105, -13, 125, -7.5] },
  { zoneId: 'WPP-711', name: 'Selat Karimata, Laut Natuna, dan Laut China Selatan', bbox: [103, -2, 110, 8] },
  { zoneId: 'WPP-712', name: 'Laut Jawa', bbox: [106, -7, 116, -3] },
  { zoneId: 'WPP-713', name: 'Selat Makassar, Teluk Bone, Laut Flores, dan Laut Bali', bbox: [115, -8, 121, 2] },
  { zoneId: 'WPP-714', name: 'Teluk Tolo dan Laut Banda', bbox: [121, -8, 128, -1] },
  { zoneId: 'WPP-715', name: 'Teluk Tomini, Laut Maluku, Laut Halmahera, dan Laut Seram', bbox: [120, -2, 132, 2] },
  { zoneId: 'WPP-716', name: 'Laut Sulawesi dan Utara Pulau Halmahera', bbox: [117, 2, 129, 6] },
  { zoneId: 'WPP-717', name: 'Teluk Cenderawasih dan Samudra Pasifik', bbox: [130, -1, 141, 6] },
  { zoneId: 'WPP-718', name: 'Laut Aru, Laut Arafuru, dan Laut Timor Bagian Timur', bbox: [130, -10, 141, -3] },
];

export const MPA_FALLBACK: Box[] = [
  { zoneId: 'mpa_raja_ampat', name: 'KKP Raja Ampat', bbox: [130.0, -1.5, 131.0, 0.0] },
  { zoneId: 'mpa_taka_bonerate', name: 'TN Taka Bonerate', bbox: [120.7, -7.2, 121.5, -6.5] },
  { zoneId: 'mpa_nusa_penida', name: 'KKP Nusa Penida', bbox: [115.4, -8.85, 115.7, -8.6] },
];

export function bboxToGeoJsonPolygon([minLng, minLat, maxLng, maxLat]: Box['bbox']) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}
