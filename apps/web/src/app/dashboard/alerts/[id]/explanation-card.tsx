"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Kartu "Analisis SIREN" (plan 07 P2.2.3 / plan 06 P1.2.4, aksen violet).
 * `initialExplanation` terisi (persisted) → render instan tanpa fetch;
 * kosong → skeleton + GET explanation (server persist sekali, lalu stabil).
 */
export function ExplanationCard({
  alertId,
  initialExplanation,
}: {
  alertId: string
  initialExplanation: string | null
}) {
  const [explanation, setExplanation] = useState(initialExplanation)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (explanation) return
    let cancelled = false
    fetch(`/api/v1/alerts/${encodeURIComponent(alertId)}/explanation`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { explanation: string }) => {
        if (!cancelled) setExplanation(data.explanation)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [alertId, explanation])

  return (
    <section className="border-signal/30 bg-signal/5 rounded-sm border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="text-signal-bright size-4" />
        <h2 className="font-display text-signal-bright text-sm font-semibold uppercase tracking-wide">
          Analisis SIREN
        </h2>
      </div>
      {explanation ? (
        <p className="text-foam text-sm leading-relaxed whitespace-pre-line">{explanation}</p>
      ) : failed ? (
        <p className="text-mist-t text-sm">Analisis belum tersedia — coba muat ulang halaman.</p>
      ) : (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}
    </section>
  )
}
