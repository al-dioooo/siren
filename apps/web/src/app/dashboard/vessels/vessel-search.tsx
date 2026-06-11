"use client"

import { Search } from "lucide-react"
import { parseAsString, useQueryStates } from "nuqs"
import { Input } from "@/components/ui/input"

/** Search registry kapal (plan 08 P1.1.1) — MMSI / nama / flag / type via URL. */
export function VesselSearch() {
  const [{ q }, setParams] = useQueryStates(
    { q: parseAsString, cursor: parseAsString },
    { shallow: false },
  )

  return (
    <div className="relative max-w-sm">
      <Search className="text-fathom absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        key={q ?? ""}
        defaultValue={q ?? ""}
        placeholder="Cari MMSI, nama, bendera, tipe..."
        className="bg-hull border-mist pl-9"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void setParams({ q: e.currentTarget.value.trim() || null, cursor: null })
          }
        }}
        onBlur={(e) => {
          const next = e.currentTarget.value.trim() || null
          if (next !== q) void setParams({ q: next, cursor: null })
        }}
      />
    </div>
  )
}
