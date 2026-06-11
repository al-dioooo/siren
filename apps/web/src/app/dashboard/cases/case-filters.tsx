"use client"

import { X } from "lucide-react"
import { parseAsStringLiteral, useQueryStates } from "nuqs"
import { AGENCY_CODES, CASE_STATUSES } from "@siren/shared"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Filter cases: status + agency + scope (plan 07 P3.1.1). */
export function CaseFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      status: parseAsStringLiteral(CASE_STATUSES),
      agencyCode: parseAsStringLiteral(AGENCY_CODES),
      scope: parseAsStringLiteral(["mine", "all"] as const),
    },
    { shallow: false },
  )

  const activeCount = Number(Boolean(filters.status)) + Number(Boolean(filters.agencyCode))

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={filters.scope ?? "mine"}
        options={[
          { value: "mine", label: "Agency saya" },
          { value: "all", label: "Semua agency" },
        ]}
        onChange={(v) => void setFilters({ scope: (v as "mine" | "all") ?? "mine" })}
        nullable={false}
      />
      <FilterSelect
        value={filters.status}
        placeholder="Status"
        options={CASE_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))}
        onChange={(v) => void setFilters({ status: v as (typeof CASE_STATUSES)[number] | null })}
      />
      <FilterSelect
        value={filters.agencyCode}
        placeholder="Agency"
        options={AGENCY_CODES.map((a) => ({ value: a, label: a }))}
        onChange={(v) => void setFilters({ agencyCode: v as (typeof AGENCY_CODES)[number] | null })}
      />
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-fathom h-8"
          onClick={() => void setFilters({ status: null, agencyCode: null })}
        >
          <X className="size-3.5" />
          Bersihkan
        </Button>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  placeholder,
  options,
  onChange,
  nullable = true,
}: {
  value: string | null
  placeholder?: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string | null) => void
  nullable?: boolean
}) {
  const items = [
    ...(nullable ? [{ value: null as string | null, label: placeholder ?? "" }] : []),
    ...options.map((o) => ({ value: o.value as string | null, label: o.label })),
  ]
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(v as string | null)}>
      <SelectTrigger size="sm" className="bg-hull border-mist h-8 min-w-28 text-xs">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value ?? "__all"} value={o.value} className="text-xs">
            {o.value === null ? `${o.label}: semua` : o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
