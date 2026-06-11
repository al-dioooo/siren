import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/server/api"
import { AnalyticsCharts, type DailyStatRow } from "./analytics-charts"
import { RangePicker } from "./range-picker"

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Analytics</h1>
        <p className="text-mist-t text-sm">Tren alert dari agregat harian — sumber matview, bukan tabel mentah.</p>
      </header>
      <RangePicker />
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const key of ["from", "to", "agency"] as const) {
    const value = params[key]
    if (typeof value === "string" && value) qs.set(key, value)
  }

  const res = await apiFetch(`/api/v1/stats/daily?${qs}`)
  if (!res.ok) {
    return (
      <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
        <p className="text-mist-t text-sm">Statistik tidak dapat dimuat — coba muat ulang halaman.</p>
      </div>
    )
  }
  const { rows } = (await res.json()) as { rows: DailyStatRow[] }

  const total = rows.reduce((sum, r) => sum + r.count, 0)

  return (
    <>
      <p className="font-data text-fathom text-xs uppercase">Total {total} alert pada rentang terpilih</p>
      <AnalyticsCharts rows={rows} />
    </>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-80 w-full" />
      ))}
    </div>
  )
}
