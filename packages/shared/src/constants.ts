// Threshold detection rules — SATU-SATUNYA sumber nilai ini (no magic values).
// Dipakai oleh apps/api/src/rules/* dan ditampilkan di UI bila perlu.

export const RULE_THRESHOLDS = {
  /** AIS gap dianggap mencurigakan di atas durasi ini (jam) */
  AIS_GAP_HOURS: 4,
  /** Loitering: kecepatan di bawah ini (knot)... */
  LOITERING_MAX_SOG_KNOTS: 2,
  /** ...selama minimal durasi ini (menit) di dalam MPA */
  LOITERING_MIN_MINUTES: 30,
  /** Encounter: jarak antar kapal maksimum (meter)... */
  ENCOUNTER_MAX_DISTANCE_M: 500,
  /** ...selama minimal durasi ini (jam) */
  ENCOUNTER_MIN_HOURS: 2,
  /** Behavior mismatch: rentang SOG khas fishing (knot) untuk kapal non-fishing */
  FISHING_PATTERN_SOG_MIN: 2.5,
  FISHING_PATTERN_SOG_MAX: 4.5,
  /** Dedup: jangan buat alert kembar (vessel+rule sama) dalam window ini (jam) */
  ALERT_DEDUP_WINDOW_HOURS: 24,
} as const;

export const AGENCY_CODES = ['PSDKP', 'BAKAMLA', 'KKP', 'POLRI', 'TNI_AL'] as const;
export type AgencyCode = (typeof AGENCY_CODES)[number];

export const RULE_TYPES = [
  'zone_violation',
  'ais_gap',
  'loitering_mpa',
  'suspicious_encounter',
  'behavior_mismatch',
] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export const RULE_LABELS: Record<RuleType, string> = {
  zone_violation: 'Pelanggaran Zona',
  ais_gap: 'AIS Gap',
  loitering_mpa: 'Loitering di Kawasan Konservasi',
  suspicious_encounter: 'Pertemuan Mencurigakan',
  behavior_mismatch: 'Perilaku Tidak Sesuai Tipe Kapal',
};

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const ALERT_STATUSES = ['new', 'dispatched', 'in_progress', 'resolved', 'false_positive'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

export const CASE_STATUSES = ['opened', 'in_progress', 'resolved', 'closed'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

/** Transisi status case yang sah (plan 07 P1.2.2) */
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  opened: ['in_progress'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

export const WPP_ZONE_IDS = [
  'WPP-571', 'WPP-572', 'WPP-573', 'WPP-711', 'WPP-712', 'WPP-713',
  'WPP-714', 'WPP-715', 'WPP-716', 'WPP-717', 'WPP-718',
] as const;
export type WppZoneId = (typeof WPP_ZONE_IDS)[number];

export const SEARCH_SINCE_VALUES = ['24h', '7d', '30d'] as const;
export type SearchSince = (typeof SEARCH_SINCE_VALUES)[number];

export type SearchFilter = {
  severity: Severity | null;
  status: AlertStatus | null;
  ruleType: RuleType | null;
  agencyCode: AgencyCode | null;
  wppZone: WppZoneId | null;
  since: SearchSince | null;
  vesselQuery: string | null;
};

export const EMPTY_FILTER: SearchFilter = {
  severity: null,
  status: null,
  ruleType: null,
  agencyCode: null,
  wppZone: null,
  since: null,
  vesselQuery: null,
};

/** Pemetaan ruleType → pasal relevan (plan 05 P3.1.2) */
export const RULE_LAW_REFS: Record<RuleType, string[]> = {
  zone_violation: ['UU 45/2009 Pasal 92', 'UU 45/2009 Pasal 93'],
  ais_gap: ['PM 7/2021 Pasal 6', 'UU 17/2008 Pasal 117'],
  loitering_mpa: ['UU 31/2004 Pasal 7', 'UU 45/2009 Pasal 100'],
  suspicious_encounter: ['UU 45/2009 Pasal 94', 'UU 17/2008 Pasal 193'],
  behavior_mismatch: ['UU 45/2009 Pasal 85', 'UU 45/2009 Pasal 93'],
};

/** Rentang waktu peta (plan 03 P2.1.4) — '24h' adalah default UI & query stats */
export const MAP_TIME_RANGES = ['24h', '48h', '7d'] as const;
export type MapTimeRange = (typeof MAP_TIME_RANGES)[number];

export const MAP_TIME_RANGE_HOURS: Record<MapTimeRange, number> = {
  '24h': 24,
  '48h': 48,
  '7d': 168,
};

export const MAP_TIME_RANGE_LABELS: Record<MapTimeRange, string> = {
  '24h': '24 Jam',
  '48h': '48 Jam',
  '7d': '7 Hari',
};

export const MAP_DEFAULT_TIME_RANGE: MapTimeRange = '24h';

/** Status alert yang dihitung "aktif" di stats strip & feed */
export const ACTIVE_ALERT_STATUSES = ['new', 'dispatched', 'in_progress'] as const satisfies readonly AlertStatus[];

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_MIME_WHITELIST = ['image/jpeg', 'image/png', 'application/pdf'] as const;

/** Rate limits (plan 02 / 06) */
export const RATE_LIMITS = {
  CHAT_PER_MINUTE: 10,
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MINUTES: 15,
} as const;
