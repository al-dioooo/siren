"use client"

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs"
import { AGENCY_CODES } from "@siren/shared"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PRESETS = [
  { days: 7, label: "7 Hari" },
  { days: 30, label: "30 Hari" },
  { days: 90, label: "90 Hari" },
] as const

/** Date range + agency picker analytics, tersinkron URL (plan 08 P3.1.3). */
export function RangePicker() {
  const [params, setParams] = useQueryStates(
    {
      from: parseAsString,
      to: parseAsString,
      agency: parseAsStringLiteral(AGENCY_CODES),
    },
    { shallow: false },
  )

  function preset(days: number) {
    const to = new Date()
    const from = new Date(Date.now() - days * 24 * 3_600_000)
    void setParams({ from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) })
  }

  const activeDays = (() => {
    if (!params.from) return 30
    const ms = (params.to ? new Date(params.to) : new Date()).getTime() - new Date(params.from).getTime()
    return Math.round(ms / (24 * 3_600_000))
  })()

  const agencyItems = [
    { value: null as string | null, label: "Agency" },
    ...AGENCY_CODES.map((a) => ({ value: a as string | null, label: a })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <Button
          key={p.days}
          size="sm"
          variant={activeDays === p.days ? "default" : "outline"}
          onClick={() => preset(p.days)}
        >
          {p.label}
        </Button>
      ))}
      <input
        type="date"
        value={params.from ?? ""}
        onChange={(e) => void setParams({ from: e.target.value || null })}
        className="bg-hull border-mist text-foam h-8 rounded-sm border px-2 text-xs"
        aria-label="Dari tanggal"
      />
      <span className="text-fathom text-xs">s/d</span>
      <input
        type="date"
        value={params.to ?? ""}
        onChange={(e) => void setParams({ to: e.target.value || null })}
        className="bg-hull border-mist text-foam h-8 rounded-sm border px-2 text-xs"
        aria-label="Sampai tanggal"
      />
      <Select
        items={agencyItems}
        value={params.agency}
        onValueChange={(v) => void setParams({ agency: (v as (typeof AGENCY_CODES)[number]) ?? null })}
      >
        <SelectTrigger size="sm" className="bg-hull border-mist h-8 min-w-28 text-xs">
          <SelectValue placeholder="Agency" />
        </SelectTrigger>
        <SelectContent>
          {agencyItems.map((o) => (
            <SelectItem key={o.value ?? "__all"} value={o.value} className="text-xs">
              {o.value === null ? "Agency: semua" : o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
