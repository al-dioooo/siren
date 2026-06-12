// Kontrak event realtime antar-komponen client (subscriber → map ping, LIVE dot).
// CustomEvent di window — tanpa context provider, komponen tetap terpisah bersih.

export const RT_ALERT_EVENT = "siren:rt-alert"
export const RT_STATUS_EVENT = "siren:rt-status"

export type RtAlertDetail = {
  id: string
  lat: number
  lng: number
  severity: string
}

export type RtStatusDetail = { status: "live" | "idle" }

export function emitRtAlert(detail: RtAlertDetail) {
  window.dispatchEvent(new CustomEvent(RT_ALERT_EVENT, { detail }))
}

export function emitRtStatus(detail: RtStatusDetail) {
  window.dispatchEvent(new CustomEvent(RT_STATUS_EVENT, { detail }))
}
