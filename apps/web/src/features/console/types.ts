export type TestVessel = {
  id: string
  mmsi: string
  name: string | null
  flag: string | null
  vesselType: string | null
  lastPosition: { lat: number; lng: number; sog: number | null; cog: number | null; timestamp: string } | null
}

export type SeedCounts = { vessels: number; positions: number; alerts: number; cases: number }

export type EngineRunResult = {
  windowStart: string
  candidates: number
  created: number
  deduped: number
  invalid: number
}
