import { z } from 'zod';
import { AGENCY_CODES, ALERT_STATUSES, RULE_TYPES, SEVERITIES, WPP_ZONE_IDS } from './constants';

/**
 * Schema filter bersama: dipakai filter manual di /dashboard/alerts DAN
 * output `generateObject` NL search router (Feature 9). Semua field nullable —
 * router yang gagal parse mengembalikan semua null (fallback aman).
 */
export const searchFilterSchema = z.object({
  severity: z.enum(SEVERITIES).nullable().default(null),
  status: z.enum(ALERT_STATUSES).nullable().default(null),
  ruleType: z.enum(RULE_TYPES).nullable().default(null),
  agencyCode: z.enum(AGENCY_CODES).nullable().default(null),
  wppZone: z.enum(WPP_ZONE_IDS).nullable().default(null),
  /** Durasi relatif: '24h' | '7d' | '30d' */
  since: z.enum(['24h', '7d', '30d']).nullable().default(null),
  /** Pencarian bebas: nama kapal / MMSI */
  vesselQuery: z.string().nullable().default(null),
});
export type SearchFilter = z.infer<typeof searchFilterSchema>;

export const EMPTY_FILTER: SearchFilter = {
  severity: null,
  status: null,
  ruleType: null,
  agencyCode: null,
  wppZone: null,
  since: null,
  vesselQuery: null,
};
