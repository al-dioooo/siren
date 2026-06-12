"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryState, parseAsStringLiteral } from "nuqs"
import { toast } from "sonner"
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { emitRtAlert, emitRtStatus } from "@/lib/realtime-events"

type AlertRow = {
  id: string
  lat: number
  lng: number
  severity: string
  rule_type: string
  assigned_agency_id: string | null
}

/**
 * Supabase Realtime: INSERT pada Alert → router.refresh() + toast + event
 * untuk sonar ping di peta (plan 03 P4.2.1). Filter agency saat scope=mine.
 */
export function AlertLiveSubscriber({ agencyId }: { agencyId: string | null }) {
  const router = useRouter()
  const [scope] = useQueryState("scope", parseAsStringLiteral(["mine", "all"]).withDefault("mine"))

  useEffect(() => {
    let cancelled = false
    let supabase: SupabaseClient | null = null
    let channel: RealtimeChannel | null = null

    void getSupabaseBrowser().then((client) => {
      if (cancelled) return
      supabase = client
      if (!supabase) {
        console.warn("[realtime] NEXT_PUBLIC_SUPABASE_* kosong — feed hanya update saat refresh")
        return
      }

      channel = supabase
        .channel("alert-feed")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "Alert" },
          (payload) => {
            const alert = payload.new as AlertRow
            // Scope mine → abaikan alert agency lain (filter client-side:
            // satu channel untuk kedua scope, toggle tanpa resubscribe)
            if (scope === "mine" && agencyId && alert.assigned_agency_id !== agencyId) {
              return
            }
            emitRtAlert({ id: alert.id, lat: alert.lat, lng: alert.lng, severity: alert.severity })
            toast("Alert baru masuk", {
              description: `${alert.rule_type} · ${alert.severity.toUpperCase()}`,
            })
            router.refresh()
          },
        )
        .subscribe((status) => {
          emitRtStatus({ status: status === "SUBSCRIBED" ? "live" : "idle" })
        })
    })

    return () => {
      cancelled = true
      emitRtStatus({ status: "idle" })
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [router, scope, agencyId])

  return null
}
