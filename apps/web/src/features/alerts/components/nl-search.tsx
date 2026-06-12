"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import type { SearchFilter } from "@siren/shared/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const EXAMPLES = ['alert kritis minggu ini', 'ais gap di WPP-711', 'kapal asing bulan lalu']

/**
 * NL Search (Feature 9, plan 06 P3.1.3): kalimat → POST /search/parse →
 * filter diterapkan ke URL feed. Chip filter aktif dirender FeedFilters.
 */
export function NlSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  async function run(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/v1/search/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { filter } = (await res.json()) as { filter: SearchFilter }
      const params = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(filter)) {
        if (value) params.set(key, String(value))
        else params.delete(key)
      }
      const target = pathname.startsWith("/dashboard") ? pathname : "/dashboard"
      router.push(`${target}?${params.toString()}`)
      setOpen(false)
      setQuery("")
    } catch {
      // Endpoint sudah null-safe; sampai sini = jaringan — biarkan user coba lagi
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border-fog bg-trench text-mist-t hover:text-foam hidden h-8 min-w-72 items-center gap-2 rounded-sm border px-3 text-sm transition-colors md:flex"
      >
        <Search className="size-4" />
        <span className="text-fathom">Cari alert, MMSI, zona...</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-trench border-fog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Pencarian</DialogTitle>
            <DialogDescription className="text-mist-t">
              Tulis bahasa sehari-hari — SIREN menerjemahkannya jadi filter.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void run(query)
            }}
            className="space-y-3"
          >
            <div className="relative">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='mis. "alert kritis minggu ini"'
                className="bg-hull border-mist pr-9"
                disabled={loading}
              />
              {loading && (
                <Loader2 className="text-signal-bright absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void run(ex)}
                  className="border-fog text-fathom hover:text-foam rounded-sm border px-2 py-1 text-[0.6875rem] transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
