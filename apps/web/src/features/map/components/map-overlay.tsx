"use client"

import {
  MAP_TIME_RANGES,
  MAP_TIME_RANGE_LABELS,
  type MapTimeRange,
} from "@siren/shared/constants"
import { Clock, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DataRow, SeverityChip } from "@/components/shared"
import { cn } from "@/lib/utils"
import { layerKeys, type LayerKey } from "../map-types"

export function MapOverlay({
  layers,
  range,
  vesselCount,
  onToggle,
  onRangeChange,
}: {
  layers: Record<LayerKey, boolean>
  range: MapTimeRange
  vesselCount: number
  onToggle: (key: LayerKey) => void
  onRangeChange: (range: MapTimeRange) => void
}) {
  return (
    <>
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Clock className="size-4" />
            {MAP_TIME_RANGE_LABELS[range]}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {MAP_TIME_RANGES.map((value) => (
              <DropdownMenuItem
                key={value}
                onClick={() => onRangeChange(value)}
                className={cn(value === range && "text-signal-bright")}
              >
                {MAP_TIME_RANGE_LABELS[value]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {layerKeys.map((key) => (
          <Button
            key={key}
            variant={layers[key] ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(key)}
          >
            <Layers className="size-4" />
            {key.toUpperCase()}
          </Button>
        ))}
      </div>

      <div className="bg-trench/95 border-mist absolute bottom-4 left-4 w-[min(360px,calc(100%-2rem))] rounded-sm border p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold">Command Center</h1>
            <p className="text-mist-t text-sm">Viewport operasional Indonesia</p>
          </div>
          <SeverityChip severity="critical" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DataRow label="Primary Zone" value="WPP-711" />
          <DataRow label="Vessels" value={String(vesselCount)} />
          <DataRow label="Window" value={MAP_TIME_RANGE_LABELS[range]} />
          <DataRow label="Tracks" value={layers.tracks ? "On" : "Off"} />
        </div>
      </div>
    </>
  )
}
