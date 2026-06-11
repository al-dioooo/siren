"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// mapbox-gl butuh window — pola sama dengan MapShell (plan 03 P2.1.1)
const MiniMap = dynamic(() => import("./mini-map").then((m) => m.MiniMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-64 w-full rounded-sm" />,
})

export function MiniMapShell(props: {
  lat: number
  lng: number
  severityColor?: string
  track?: GeoJSON.Feature<GeoJSON.LineString> | null
  className?: string
}) {
  return <MiniMap {...props} className={cn("min-h-64", props.className)} />
}
