import type { Severity } from "@siren/shared/constants"
import { cn } from "@/lib/utils"

const severityClass: Record<Severity, string> = {
  critical: "border-sev-critical/40 bg-sev-critical/10 text-sev-critical",
  high: "border-sev-high/40 bg-sev-high/10 text-sev-high",
  medium: "border-sev-medium/40 bg-sev-medium/10 text-sev-medium",
  low: "border-sev-low/40 bg-sev-low/10 text-sev-low",
}

const severityLabel: Record<Severity, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
}

export function SeverityChip({
  severity,
  className,
}: {
  severity: Severity
  className?: string
}) {
  return (
    <span
      className={cn(
        "font-data inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-[0.6875rem] font-medium uppercase",
        severityClass[severity],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {severityLabel[severity]}
    </span>
  )
}
