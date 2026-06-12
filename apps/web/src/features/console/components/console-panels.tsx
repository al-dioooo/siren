"use client"

import { useCallback, useEffect, useState } from "react"
import type { TestVessel } from "../types"
import { AlertInjector } from "./alert-injector"
import { EngineTrigger } from "./engine-trigger"
import { SeedControls } from "./seed-controls"
import { VesselSimulator } from "./vessel-simulator"

/** Daftar kapal uji dibagikan ke simulator & injector — satu sumber, satu refresh. */
export function ConsolePanels() {
  const [vessels, setVessels] = useState<TestVessel[]>([])

  const refreshVessels = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/console/vessels")
      if (!res.ok) return
      const data = (await res.json()) as { vessels: TestVessel[] }
      setVessels(data.vessels)
    } catch {
      // jaringan gagal — biarkan daftar lama
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/console/vessels")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { vessels: TestVessel[] } | null) => {
        if (!cancelled && data) setVessels(data.vessels)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <VesselSimulator vessels={vessels} onVesselsChanged={refreshVessels} />
      <AlertInjector vessels={vessels} />
      <EngineTrigger />
      <SeedControls onDataChanged={refreshVessels} />
    </div>
  )
}
