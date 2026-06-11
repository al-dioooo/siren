import { z } from 'zod';

// Schemas respons Global Fishing Watch API v3 (plan 04 P1.1.1).
// Sengaja loose: GFW menambah field tanpa pemberitahuan — kita hanya
// memvalidasi field yang benar-benar dipakai pipeline.

/** Jenis event GFW yang dipakai SIREN ↔ dataset v3 */
export const GFW_EVENT_TYPES = ['fishing', 'encounter', 'loitering', 'gap', 'port_visit'] as const;
export type GfwEventType = (typeof GFW_EVENT_TYPES)[number];

export const GFW_EVENT_DATASETS: Record<GfwEventType, string> = {
  fishing: 'public-global-fishing-events:latest',
  encounter: 'public-global-encounters-events:latest',
  loitering: 'public-global-loitering-events:latest',
  gap: 'public-global-gaps-events:latest',
  port_visit: 'public-global-port-visits-events:latest',
};

export const GFW_VESSEL_DATASET = 'public-global-vessel-identity:latest';

/** Identitas self-reported (AIS) — sumber mmsi/nama/flag */
export const gfwSelfReportedInfoSchema = z.looseObject({
  id: z.string(),
  ssvid: z.string(), // MMSI
  shipname: z.string().nullish(),
  flag: z.string().nullish(), // ISO alpha-3
  imo: z.string().nullish(),
  callsign: z.string().nullish(),
  shiptypes: z.array(z.string()).nullish(),
  transmissionDateFrom: z.string().nullish(),
  transmissionDateTo: z.string().nullish(),
});
export type GfwSelfReportedInfo = z.infer<typeof gfwSelfReportedInfoSchema>;

export const gfwVesselSchema = z.looseObject({
  dataset: z.string().nullish(),
  selfReportedInfo: z.array(gfwSelfReportedInfoSchema).default([]),
  registryInfo: z
    .array(
      z.looseObject({
        id: z.string().nullish(),
        shipname: z.string().nullish(),
        flag: z.string().nullish(),
        vesselType: z.string().nullish(),
        geartypes: z.array(z.string()).nullish(),
      }),
    )
    .nullish(),
});
export type GfwVessel = z.infer<typeof gfwVesselSchema>;

export const gfwVesselSearchResponseSchema = z.looseObject({
  total: z.number().nullish(),
  limit: z.number().nullish(),
  since: z.string().nullish(),
  entries: z.array(gfwVesselSchema).default([]),
});
export type GfwVesselSearchResponse = z.infer<typeof gfwVesselSearchResponseSchema>;

export const gfwEventVesselSchema = z.looseObject({
  id: z.string(),
  ssvid: z.string().nullish(),
  name: z.string().nullish(),
  flag: z.string().nullish(),
  type: z.string().nullish(),
});

export const gfwEventSchema = z.looseObject({
  id: z.string(),
  type: z.string(),
  start: z.string(),
  end: z.string().nullish(),
  position: z.looseObject({ lat: z.number(), lon: z.number() }).nullish(),
  vessel: gfwEventVesselSchema,
});
export type GfwEvent = z.infer<typeof gfwEventSchema>;

export const gfwEventsResponseSchema = z.looseObject({
  total: z.number().nullish(),
  limit: z.number().nullish(),
  offset: z.number().nullish(),
  nextOffset: z.number().nullish(),
  entries: z.array(gfwEventSchema).default([]),
});
export type GfwEventsResponse = z.infer<typeof gfwEventsResponseSchema>;

/** Posisi turunan dari event (API publik GFW tidak mengekspos track AIS mentah) */
export const gfwDerivedPositionSchema = z.object({
  vesselGfwId: z.string(),
  timestamp: z.string(),
  lat: z.number(),
  lng: z.number(),
  sourceEventId: z.string(),
  sourceEventType: z.string(),
});
export type GfwDerivedPosition = z.infer<typeof gfwDerivedPositionSchema>;
