"use client"

import { ChevronDown } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
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
  const [{ scope }, setScopeState] = useQueryStates(
    {
      scope: parseAsStringLiteral(SCOPES).withDefault("mine"),
      cursor: parseAsString,
    },
    { shallow: false },
  )
  const label = SCOPE_LABELS[scope]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            data-tour="scope-toggle"
            aria-label={`Scope data: ${label}`}
            title="Scope data dashboard"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 md:inline-flex"
          />
        }
      >
        {label}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SCOPES.map((value) => (
          <DropdownMenuItem
            key={value}
            onClick={() => {
              if (value === scope) return
              void setScopeState({ scope: value, cursor: null })
            }}
            className={cn(value === scope && "text-signal-bright")}
          >
            {SCOPE_LABELS[value]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
