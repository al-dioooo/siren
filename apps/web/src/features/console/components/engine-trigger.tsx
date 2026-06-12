"use client"

import { useState } from "react"
import { Radar } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { EngineRunResult } from "../types"

/** Trigger alert engine 5-rule on demand — menampilkan hasil run. */
export function EngineTrigger() {
  const [windowHours, setWindowHours] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<EngineRunResult | null>(null)

  async function run() {
    setBusy(true)
    try {
      const hours = Number(windowHours)
      const res = await fetch("/api/v1/console/engine/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          windowHours.trim() !== "" && Number.isFinite(hours) ? { windowHours: hours } : {},
        ),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? "Engine run gagal")
        return
      }
      const data = (await res.json()) as EngineRunResult
      setResult(data)
      toast.success(`Engine selesai — ${data.created} alert baru`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-fog bg-trench rounded-sm border">
      <header className="border-fog flex h-12 items-center gap-2 border-b px-4">
        <Radar className="text-signal-bright size-4" />
        <h2 className="font-display text-sm font-semibold">Alert Engine</h2>
      </header>

      <div className="space-y-3 p-4">
        <div className="flex items-end gap-2">
          <div className="w-32">
            <Label className="text-fathom text-xs">Window (jam)</Label>
            <Input
              value={windowHours}
              onChange={(e) => setWindowHours(e.target.value)}
              placeholder="auto"
              className="bg-hull border-mist h-8 text-sm"
            />
          </div>
          <Button size="sm" disabled={busy} onClick={() => void run()}>
            {busy ? "Berjalan..." : "Jalankan engine"}
          </Button>
        </div>

        {result && (
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ["Kandidat", result.candidates],
                ["Dibuat", result.created],
                ["Dedup", result.deduped],
                ["Invalid", result.invalid],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border-fog bg-hull rounded-sm border p-2 text-center">
                <div className="font-data text-foam text-lg">{value}</div>
                <div className="font-data text-fathom text-[0.625rem] uppercase">{label}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-fathom text-xs">
          Menjalankan 5 rule atas window sejak run terakhir (atau window jam di atas). Run dari konsol
          ikut memajukan watermark engine.
        </p>
      </div>
    </section>
  )
}
