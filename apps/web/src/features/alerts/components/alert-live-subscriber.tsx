"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { toast } from "sonner"
import { emitRtAlert, emitRtStatus } from "@/lib/realtime-events"

type AlertRow = {
  id: string
  lat: number
  lng: number
  severity: string
  rule_type: string
  assigned_agency_id: string | null
}

const STREAM_URL = "/api/v1/alerts/stream"

/**
 * SSE dari API (trigger pg_notify pada INSERT Alert) → router.refresh() + toast
 * + event untuk sonar ping di peta (plan 03 P4.2.1). Filter agency saat
 * scope=mine. EventSource menangani reconnect sendiri, jadi tidak ada backoff
 * manual di sini; status LIVE ikut open/error stream.
 */
export function AlertLiveSubscriber({ agencyId }: { agencyId: string | null }) {
  const router = useRouter()
  const [scope] = useQueryState("scope", parseAsStringLiteral(["mine", "all"]).withDefault("mine"))

  useEffect(() => {
    // Same-origin: cookie session Better Auth ikut otomatis.
    const source = new EventSource(STREAM_URL)

    const onReady = () => emitRtStatus({ status: "live" })
    const onError = () => emitRtStatus({ status: "idle" })

    const onAlert = (event: MessageEvent<string>) => {
      let alert: AlertRow
      try {
        alert = JSON.parse(event.data) as AlertRow
      } catch {
        console.warn("[realtime] payload alert tidak valid")
        return
      }
      // Scope mine → abaikan alert agency lain (filter client-side:
      // satu stream untuk kedua scope, toggle tanpa resubscribe)
      if (scope === "mine" && agencyId && alert.assigned_agency_id !== agencyId) {
        return
      }
      emitRtAlert({ id: alert.id, lat: alert.lat, lng: alert.lng, severity: alert.severity })
      toast("Alert baru masuk", {
        description: `${alert.rule_type} · ${alert.severity.toUpperCase()}`,
      })
      router.refresh()
    }

    source.addEventListener("ready", onReady)
    source.addEventListener("alert", onAlert)
    source.addEventListener("error", onError)

    return () => {
      source.removeEventListener("ready", onReady)
      source.removeEventListener("alert", onAlert)
      source.removeEventListener("error", onError)
      source.close()
      emitRtStatus({ status: "idle" })
    }
  }, [router, scope, agencyId])

  return null
}
