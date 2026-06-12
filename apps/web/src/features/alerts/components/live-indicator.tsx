"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { RT_STATUS_EVENT, type RtStatusDetail } from "@/lib/realtime-events"

/** Dot LIVE di top bar: violet pulse saat channel SUBSCRIBED, abu-abu saat putus (P4.2.3). */
export function LiveIndicator() {
  const [live, setLive] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => setLive((e as CustomEvent<RtStatusDetail>).detail.status === "live")
    window.addEventListener(RT_STATUS_EVENT, handler)
    return () => window.removeEventListener(RT_STATUS_EVENT, handler)
  }, [])

  return (
    <div className="border-fog bg-trench hidden h-8 items-center gap-2 rounded-sm border px-2.5 md:flex">
      <span
        className={cn("size-2 rounded-full", live ? "bg-signal live-pulse" : "bg-idle")}
        aria-hidden="true"
      />
      <span className="font-data text-[0.6875rem] text-mist-t">{live ? "LIVE" : "IDLE"}</span>
    </div>
  )
}
