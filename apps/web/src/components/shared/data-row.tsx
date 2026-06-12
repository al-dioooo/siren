import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function DataRow({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <div className="text-fathom text-xs">{label}</div>
      <div className="font-data text-foam truncate text-sm">{value}</div>
    </div>
  )
}
