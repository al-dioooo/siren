"use client"

import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function MapSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("border-fog bg-trench relative overflow-hidden rounded-sm border", className)}>
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-data text-fathom text-xs uppercase">Memuat peta...</span>
      </div>
    </div>
  )
}

// mapbox-gl butuh window — render hanya di client (plan 03 P2.1.1)
const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <MapSkeleton className="min-h-[560px]" />,
})

export function MapShell({ className }: { className?: string }) {
  return <MapView className={className} />
}
