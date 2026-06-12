"use client"

import { useState } from "react"
import { DatabaseZap } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { SeedCounts } from "../types"

/** Seed/reset data demo — hanya menyentuh row seed_*, data GFW aman. */
export function SeedControls({ onDataChanged }: { onDataChanged: () => Promise<void> | void }) {
  const [resetFirst, setResetFirst] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [counts, setCounts] = useState<SeedCounts | null>(null)

  async function seed() {
    setBusy(true)
    try {
      const res = await fetch("/api/v1/console/seed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reset: resetFirst }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? "Seed gagal")
        return
      }
      const data = (await res.json()) as { counts: SeedCounts }
      setCounts(data.counts)
      toast.success(`Seed selesai — ${data.counts.vessels} kapal, ${data.counts.alerts} alert`)
      await onDataChanged()
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    setBusy(true)
    try {
      const res = await fetch("/api/v1/console/reset", { method: "POST" })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? "Reset gagal")
        return
      }
      setCounts(null)
      toast.success("Semua data seed dihapus — data GFW tidak disentuh")
      setConfirmReset(false)
      await onDataChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-fog bg-trench rounded-sm border">
      <header className="border-fog flex h-12 items-center gap-2 border-b px-4">
        <DatabaseZap className="text-signal-bright size-4" />
        <h2 className="font-display text-sm font-semibold">Data Demo</h2>
      </header>

      <div className="space-y-3 p-4">
        <label className="text-mist-t flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={resetFirst}
            onChange={(e) => setResetFirst(e.target.checked)}
            className="accent-signal"
          />
          Reset seed lama dulu sebelum seeding
        </label>

        <div className="flex items-center gap-2">
          <Button size="sm" disabled={busy} onClick={() => void seed()}>
            {busy ? "Memproses..." : "Seed demo data"}
          </Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmReset(true)}>
            Reset semua data seed
          </Button>
        </div>

        {counts && (
          <p className="font-data text-mist-t text-xs">
            Terakhir: {counts.vessels} kapal · {counts.positions} posisi · {counts.alerts} alert ·{" "}
            {counts.cases} case
          </p>
        )}
        <p className="text-fathom text-xs">
          Seeding ±1000 posisi sekuensial — dapat memakan waktu hingga ~1 menit. Hanya row berprefix
          seed_ yang tersentuh; data GFW asli aman.
        </p>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="bg-trench border-fog sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Reset data seed?</DialogTitle>
            <DialogDescription className="text-mist-t">
              Semua kapal, posisi, alert, dan case sintetis (prefix seed_) akan dihapus, termasuk kapal
              uji dari konsol ini. Data GFW asli tidak disentuh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmReset(false)} disabled={busy}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => void reset()} disabled={busy}>
              {busy ? "Memproses..." : "Ya, hapus semua seed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
