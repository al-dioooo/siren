"use client"

import { Download, X } from "lucide-react"
import { parseAsString, useQueryStates } from "nuqs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ACTIONS = [
  "alert.dispatch",
  "alert.escalate",
  "alert.false_positive",
  "case.open",
  "case.status_change",
  "case.note",
  "case.handoff",
  "case.attachment_upload",
  "case.evidence_generated",
] as const

/** Filter audit (plan 08 P4.1.2) + tombol export CSV (P4.1.3). */
export function AuditFilters() {
  const [filters, setFilters] = useQueryStates(
    {
      action: parseAsString,
      actor: parseAsString,
      from: parseAsString,
      to: parseAsString,
      cursor: parseAsString,
    },
    { shallow: false },
  )

  const activeCount = [filters.action, filters.actor, filters.from, filters.to].filter(Boolean).length

  const csvParams = new URLSearchParams({ format: "csv" })
  for (const key of ["action", "actor", "from", "to"] as const) {
    if (filters[key]) csvParams.set(key, filters[key]!)
  }

  const actionItems = [
    { value: null as string | null, label: "Action" },
    ...ACTIONS.map((a) => ({ value: a as string | null, label: a })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        key={filters.actor ?? ""}
        defaultValue={filters.actor ?? ""}
        placeholder="Actor (nama/email)"
        className="bg-hull border-mist h-8 w-44 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter")
            void setFilters({ actor: e.currentTarget.value.trim() || null, cursor: null })
        }}
        onBlur={(e) => {
          const next = e.currentTarget.value.trim() || null
          if (next !== filters.actor) void setFilters({ actor: next, cursor: null })
        }}
      />
      <Select
        items={actionItems}
        value={filters.action}
        onValueChange={(v) => void setFilters({ action: v as string | null, cursor: null })}
      >
        <SelectTrigger size="sm" className="bg-hull border-mist h-8 min-w-36 text-xs">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          {actionItems.map((o) => (
            <SelectItem key={o.value ?? "__all"} value={o.value} className="font-data text-xs">
              {o.value === null ? "Action: semua" : o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        type="date"
        value={filters.from ?? ""}
        onChange={(e) => void setFilters({ from: e.target.value || null, cursor: null })}
        className="bg-hull border-mist text-foam h-8 rounded-sm border px-2 text-xs"
        aria-label="Dari tanggal"
      />
      <span className="text-fathom text-xs">s/d</span>
      <input
        type="date"
        value={filters.to ?? ""}
        onChange={(e) => void setFilters({ to: e.target.value || null, cursor: null })}
        className="bg-hull border-mist text-foam h-8 rounded-sm border px-2 text-xs"
        aria-label="Sampai tanggal"
      />
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="text-fathom h-8"
          onClick={() =>
            void setFilters({ action: null, actor: null, from: null, to: null, cursor: null })
          }
        >
          <X className="size-3.5" />
          Bersihkan
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href={`/api/v1/audit?${csvParams}`} />}
      >
        <Download className="size-3.5" />
        Export CSV
      </Button>
    </div>
  )
}
