"use client"

import { ChevronDown } from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const SCOPES = ["mine", "all"] as const
const SCOPE_LABELS: Record<(typeof SCOPES)[number], string> = {
  mine: "Agency Saya",
  all: "Semua Agency",
}

/** Toggle scope feed via URL `?scope=mine|all` (plan 03 P4.1.2). */
export function ScopeToggle() {
  const [scope, setScope] = useQueryState(
    "scope",
    parseAsStringLiteral(SCOPES).withDefault("mine").withOptions({ shallow: false }),
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            data-tour="scope-toggle"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 md:inline-flex"
          />
        }
      >
        {SCOPE_LABELS[scope]}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SCOPES.map((value) => (
          <DropdownMenuItem
            key={value}
            onSelect={() => setScope(value)}
            className={cn(value === scope && "text-signal-bright")}
          >
            {SCOPE_LABELS[value]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
