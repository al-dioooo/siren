import type { AlertStatus, CaseStatus } from "@siren/shared/constants"
import { cn } from "@/lib/utils"

type Status = AlertStatus | CaseStatus

const label: Record<Status, string> = {
  new: "New",
  dispatched: "Dispatched",
  in_progress: "In Progress",
  resolved: "Resolved",
  false_positive: "False Positive",
  opened: "Opened",
  closed: "Closed",
}

const statusClass: Record<Status, string> = {
  new: "border-signal/50 bg-signal/10 text-signal-bright",
  dispatched: "border-signal bg-signal text-abyss",
  in_progress: "border-signal/70 bg-signal/15 text-signal-bright",
  resolved: "border-ok/50 bg-ok/10 text-ok",
  false_positive: "border-idle/40 bg-idle/10 text-fathom line-through",
  opened: "border-signal/50 bg-signal/10 text-signal-bright",
  closed: "border-idle/40 bg-idle/10 text-fathom",
}

export function StatusBadge({
  status,
  className,
}: {
  status: Status
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-data inline-flex h-6 items-center rounded-sm border px-2 text-[0.6875rem] font-medium uppercase",
        status === "in_progress" && "live-pulse",
        statusClass[status],
        className
      )}
    >
      {label[status]}
    </span>
  )
}
