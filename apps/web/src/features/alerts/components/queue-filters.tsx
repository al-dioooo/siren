"use client"

import { X } from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import {
  AGENCY_CODES,
  RULE_LABELS,
  RULE_TYPES,
  SEVERITIES,
  ALERT_STATUSES,
  WPP_ZONE_IDS,
} from "@siren/shared/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const SINCE_OPTIONS = [
  { value: "24h", label: "24 Jam" },
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
] as const

/**
 * Panel filter queue alerts (plan 07 P2.1.1) — tersinkron URL via nuqs,
 * field sama dengan `searchFilterSchema` sehingga NL search menulis URL yang sama.
 */
export function QueueFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      severity: parseAsStringLiteral(SEVERITIES),
      status: parseAsStringLiteral(ALERT_STATUSES),
      ruleType: parseAsStringLiteral(RULE_TYPES),
      agencyCode: parseAsStringLiteral(AGENCY_CODES),
      wppZone: parseAsStringLiteral(WPP_ZONE_IDS),
      since: parseAsStringLiteral(["24h", "7d", "30d"] as const),
      vesselQuery: parseAsString,
      cursor: parseAsString, // filter berubah → kembali ke halaman pertama
    },
    { shallow: false },
  )

  const activeCount = Object.entries(filters).filter(([k, v]) => k !== "cursor" && v).length

  function set(key: keyof typeof filters, value: string | null) {
    void setFilters({ [key]: value, cursor: null })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        defaultValue={filters.vesselQuery ?? ""}
        key={filters.vesselQuery ?? ""}
        placeholder="Nama kapal / MMSI"
        className="bg-hull border-mist h-8 w-44 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") set("vesselQuery", e.currentTarget.value.trim() || null)
        }}
        onBlur={(e) => {
          const next = e.currentTarget.value.trim() || null
          if (next !== filters.vesselQuery) set("vesselQuery", next)
        }}
      />
      <FilterSelect
        value={filters.severity}
        placeholder="Severity"
        options={SEVERITIES.map((s) => ({ value: s, label: s.toUpperCase() }))}
        onChange={(v) => set("severity", v)}
      />
      <FilterSelect
        value={filters.status}
        placeholder="Status"
        options={ALERT_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))}
        onChange={(v) => set("status", v)}
      />
      <FilterSelect
        value={filters.ruleType}
        placeholder="Rule"
        options={RULE_TYPES.map((r) => ({ value: r, label: RULE_LABELS[r] }))}
        onChange={(v) => set("ruleType", v)}
      />
      <FilterSelect
        value={filters.agencyCode}
        placeholder="Agency"
        options={AGENCY_CODES.map((a) => ({ value: a, label: a }))}
        onChange={(v) => set("agencyCode", v)}
      />
      <FilterSelect
        value={filters.wppZone}
        placeholder="WPP"
        options={WPP_ZONE_IDS.map((w) => ({ value: w, label: w }))}
        onChange={(v) => set("wppZone", v)}
      />
      <FilterSelect
        value={filters.since}
        placeholder="Periode"
        options={[...SINCE_OPTIONS]}
        onChange={(v) => set("since", v)}
      />
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-fathom h-8"
          onClick={() =>
            void setFilters({
              severity: null, status: null, ruleType: null, agencyCode: null,
              wppZone: null, since: null, vesselQuery: null, cursor: null,
            })
          }
        >
          <X className="size-3.5" />
          Bersihkan ({activeCount})
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
}: {
  value: string | null
  placeholder: string
  options: ReadonlyArray<{ value: string; label: string }>
  onChange: (value: string | null) => void
}) {
  const items = [
    { value: null, label: placeholder },
    ...options.map((o) => ({ value: o.value as string | null, label: o.label })),
  ]
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange(v as string | null)}
    >
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
