"use client"

import { ListFilter, X } from "lucide-react"
import { parseAsStringLiteral, useQueryState, useQueryStates, parseAsString } from "nuqs"
import { RULE_LABELS, RULE_TYPES, SEVERITIES } from "@siren/shared"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** Quick filter feed: severity + rule type via nuqs (plan 03 P4.1.3). */
export function FeedFilters() {
  const [severity, setSeverity] = useQueryState(
    "severity",
    parseAsStringLiteral(SEVERITIES).withOptions({ shallow: false }),
  )
  const [ruleType, setRuleType] = useQueryState(
    "ruleType",
    parseAsStringLiteral(RULE_TYPES).withOptions({ shallow: false }),
  )
  // Filter hasil NL search yang juga bisa dibersihkan dari sini
  const [extra, setExtra] = useQueryStates(
    {
      status: parseAsString,
      since: parseAsString,
      wppZone: parseAsString,
      vesselQuery: parseAsString,
    },
    { shallow: false },
  )

  const activeCount =
    Number(Boolean(severity)) +
    Number(Boolean(ruleType)) +
    Object.values(extra).filter(Boolean).length

  return (
    <div className="flex items-center gap-1.5">
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-fathom h-7 px-1.5"
          onClick={() => {
            void setSeverity(null)
            void setRuleType(null)
            void setExtra({ status: null, since: null, wppZone: null, vesselQuery: null })
          }}
        >
          <X className="size-3.5" />
          {activeCount}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant={activeCount > 0 ? "default" : "outline"} size="sm" className="h-7" />}
        >
          <ListFilter className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Severity</DropdownMenuLabel>
          {SEVERITIES.map((s) => (
            <DropdownMenuItem
              key={s}
              onSelect={() => void setSeverity(severity === s ? null : s)}
              className={cn("font-data text-xs uppercase", severity === s && "text-signal-bright")}
            >
              {s}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Rule</DropdownMenuLabel>
          {RULE_TYPES.map((r) => (
            <DropdownMenuItem
              key={r}
              onSelect={() => void setRuleType(ruleType === r ? null : r)}
              className={cn("text-xs", ruleType === r && "text-signal-bright")}
            >
              {RULE_LABELS[r]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
