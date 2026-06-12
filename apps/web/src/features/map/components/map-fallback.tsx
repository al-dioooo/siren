import { Clock, Layers, Maximize2, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataRow, SeverityChip } from "@/components/shared"
import { cn } from "@/lib/utils"

export function MapFallback({ className, reason }: { className?: string; reason: string }) {
  return (
    <div className={cn("border-fog bg-trench relative overflow-hidden rounded-sm border", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(34_211_238_/_0.08)_1px,transparent_1px),linear-gradient(rgb(34_211_238_/_0.08)_1px,transparent_1px)] bg-[size:80px_80px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_42%,rgb(34_211_238_/_0.12),transparent_34%)]" />
      <div className="absolute left-[18%] top-[22%] h-32 w-52 rotate-[-18deg] rounded-[45%] border border-territory/50 bg-territory/5" />
      <div className="absolute right-[18%] top-[36%] h-44 w-64 rotate-[12deg] rounded-[44%] border border-territory/40 bg-territory/5" />
      <div className="absolute bottom-[18%] left-[38%] h-36 w-56 rotate-[22deg] rounded-[45%] border border-territory/35 bg-territory/5" />

      <FallbackMarker className="left-[34%] top-[36%]" severity="critical" />
      <FallbackMarker className="right-[31%] top-[48%]" severity="high" />
      <FallbackMarker className="bottom-[28%] left-[48%]" severity="medium" />

      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <Layers className="size-4" />
          WPP / ZEE / MPA
        </Button>
        <Button variant="outline" size="sm">
          <Clock className="size-4" />
          24 Jam
        </Button>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <Button variant="outline" size="icon-sm" aria-label="Perbesar peta">
          <Plus className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Perkecil peta">
          <Minus className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Layar penuh">
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <div className="bg-trench/95 border-mist absolute bottom-4 left-4 w-[min(420px,calc(100%-2rem))] rounded-sm border p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-semibold">Command Center</h1>
            <p className="text-mist-t text-sm">Mapbox fallback active</p>
          </div>
          <SeverityChip severity="critical" />
        </div>
        <p className="text-mist-t mb-4 text-sm">{reason}</p>
        <div className="grid grid-cols-2 gap-3">
          <DataRow label="Primary Zone" value="WPP-711" />
          <DataRow label="Realtime" value="Pending" />
          <DataRow label="Markers" value="Fallback" />
          <DataRow label="Tracks" value="24h Window" />
        </div>
      </div>
    </div>
  )
}

function FallbackMarker({
  severity,
  className,
}: {
  severity: "critical" | "high" | "medium"
  className: string
}) {
  const color =
    severity === "critical"
      ? "bg-sev-critical"
      : severity === "high"
        ? "bg-sev-high"
        : "bg-sev-medium"

  return (
    <div className={`absolute ${className}`}>
      <span className={`block size-3 rounded-full ${color} shadow-[0_0_24px_currentColor]`} />
      {severity === "critical" && <span className="sonar-ping absolute -left-3 -top-3 size-9" />}
    </div>
  )
}
