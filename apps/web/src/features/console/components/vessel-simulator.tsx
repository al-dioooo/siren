"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Pause, Play, Ship } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TestVessel } from "../types"

type LastPos = { lat: number; lng: number; sog: number; cog: number; timestamp: string }

const AUTOPLAY_INTERVAL_MS = 2_000

/** Simulator pergerakan kapal uji — spawn, step manual, dan auto-play. */
export function VesselSimulator({
  vessels,
  onVesselsChanged,
}: {
  vessels: TestVessel[]
  onVesselsChanged: () => Promise<void> | void
}) {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [lat, setLat] = useState("4.5")
  const [lng, setLng] = useState("107.5")
  const [headingDeg, setHeadingDeg] = useState("")
  const [sogKnots, setSogKnots] = useState("12")
  const [stepMinutes, setStepMinutes] = useState("30")
  const [lastPos, setLastPos] = useState<LastPos | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const stepInFlight = useRef(false)

  const selected = vessels.find((v) => v.id === vesselId) ?? null

  async function spawn() {
    setBusy(true)
    try {
      const res = await fetch("/api/v1/console/vessels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          lat: Number(lat),
          lng: Number(lng),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? "Spawn kapal gagal")
        return
      }
      const { vessel } = (await res.json()) as { vessel: TestVessel }
      toast.success(`Kapal uji ${vessel.name ?? vessel.mmsi} dibuat`, {
        description: `MMSI ${vessel.mmsi}`,
      })
      await onVesselsChanged()
      setVesselId(vessel.id)
      setLastPos(vessel.lastPosition as LastPos | null)
    } finally {
      setBusy(false)
    }
  }

  async function step(id: string): Promise<boolean> {
    if (stepInFlight.current) return true
    stepInFlight.current = true
    try {
      const res = await fetch(`/api/v1/console/vessels/${encodeURIComponent(id)}/step`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(headingDeg.trim() !== "" ? { headingDeg: Number(headingDeg) } : {}),
          sogKnots: Number(sogKnots),
          stepMinutes: Number(stepMinutes),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? "Step gagal")
        return false
      }
      const { position } = (await res.json()) as { position: LastPos }
      setLastPos(position)
      return true
    } catch {
      return false
    } finally {
      stepInFlight.current = false
    }
  }

  useEffect(() => {
    if (!autoPlay || !vesselId) return
    const interval = setInterval(() => {
      void step(vesselId).then((ok) => {
        if (!ok) setAutoPlay(false)
      })
    }, AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(interval)
    // step membaca state form terbaru via closure — cukup re-arm saat toggle/kapal berubah
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, vesselId])

  const vesselItems = [
    { value: null as string | null, label: "Pilih kapal uji" },
    ...vessels.map((v) => ({ value: v.id as string | null, label: `${v.name ?? "Tanpa nama"} · ${v.mmsi}` })),
  ]

  return (
    <section className="border-fog bg-trench rounded-sm border">
      <header className="border-fog flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Ship className="text-signal-bright size-4" />
          <h2 className="font-display text-sm font-semibold">Simulator Kapal</h2>
        </div>
        <Link href="/dashboard" className="font-data text-signal-bright text-xs uppercase hover:underline">
          Lihat di peta →
        </Link>
      </header>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className="font-data text-fathom text-[0.6875rem] uppercase">Spawn kapal baru</p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama (opsional)"
              className="bg-hull border-mist col-span-2 h-8 text-sm"
            />
            <div>
              <Label className="text-fathom text-xs">Lat</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} className="bg-hull border-mist h-8 text-sm" />
            </div>
            <div>
              <Label className="text-fathom text-xs">Lng</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} className="bg-hull border-mist h-8 text-sm" />
            </div>
          </div>
          <Button size="sm" onClick={() => void spawn()} disabled={busy}>
            {busy ? "Memproses..." : "Spawn kapal uji"}
          </Button>
        </div>

        <div className="border-fog space-y-2 border-t pt-4">
          <p className="font-data text-fathom text-[0.6875rem] uppercase">Gerakkan kapal</p>
          <Select
            items={vesselItems}
            value={vesselId}
            onValueChange={(v) => {
              setAutoPlay(false)
              setVesselId(v as string | null)
              const next = vessels.find((it) => it.id === v)
              setLastPos((next?.lastPosition as LastPos | null) ?? null)
            }}
          >
            <SelectTrigger size="sm" className="bg-hull border-mist h-8 w-full text-xs">
              <SelectValue placeholder="Pilih kapal uji" />
            </SelectTrigger>
            <SelectContent>
              {vesselItems.map((o) => (
                <SelectItem key={o.value ?? "__none"} value={o.value} className="font-data text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-fathom text-xs">Heading °</Label>
              <Input
                value={headingDeg}
                onChange={(e) => setHeadingDeg(e.target.value)}
                placeholder="auto"
                className="bg-hull border-mist h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-fathom text-xs">SOG kn</Label>
              <Input value={sogKnots} onChange={(e) => setSogKnots(e.target.value)} className="bg-hull border-mist h-8 text-sm" />
            </div>
            <div>
              <Label className="text-fathom text-xs">Step menit</Label>
              <Input value={stepMinutes} onChange={(e) => setStepMinutes(e.target.value)} className="bg-hull border-mist h-8 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!vesselId || busy}
              onClick={() => vesselId && void step(vesselId)}
            >
              Step sekali
            </Button>
            <Button
              size="sm"
              variant={autoPlay ? "destructive" : "default"}
              disabled={!vesselId}
              onClick={() => setAutoPlay((v) => !v)}
            >
              {autoPlay ? (
                <>
                  <Pause className="size-3.5" /> Stop auto-play
                </>
              ) : (
                <>
                  <Play className="size-3.5" /> Auto-play
                </>
              )}
            </Button>
          </div>

          {(lastPos ?? selected?.lastPosition) && (
            <p className="font-data text-mist-t text-xs">
              Posisi terakhir: {(lastPos ?? selected!.lastPosition!).lat.toFixed(4)},{" "}
              {(lastPos ?? selected!.lastPosition!).lng.toFixed(4)} · COG{" "}
              {(lastPos ?? selected!.lastPosition!).cog ?? "-"}° ·{" "}
              {new Date((lastPos ?? selected!.lastPosition!).timestamp).toLocaleTimeString("id-ID")}
            </p>
          )}
          <p className="text-fathom text-xs">
            Peta dashboard menyegarkan posisi tiap ±60 detik — pergerakan muncul pada poll berikutnya.
          </p>
        </div>
      </div>
    </section>
  )
}
