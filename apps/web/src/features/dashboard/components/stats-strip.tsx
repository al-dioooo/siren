import { headers } from "next/headers"
import { Skeleton } from "@/components/ui/skeleton"

type StatsOverview = {
  activeAlerts: number
  vesselsTracked: number
  darkVessels: number
  openCases: number
  windowHours: number
}

const formatter = new Intl.NumberFormat("id-ID")

/**
 * Stats strip dashboard (plan 03 P2.2.2) — Server Component dinamis,
 * di-stream lewat <Suspense> dari page (PPR shell tetap statis).
 */
export async function StatsStrip() {
  const h = await headers()
  const base = process.env.API_BASE_URL ?? "http://localhost:4000"
  const res = await fetch(`${base}/api/v1/stats/overview`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  })

  if (!res.ok) {
    return <StatsGrid items={statItems(null)} />
  }

  const stats = (await res.json()) as StatsOverview
  return <StatsGrid items={statItems(stats)} />
}

export function StatsStripSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-fog bg-hull rounded-sm border p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-14" />
        </div>
      ))}
    </div>
  )
}

function statItems(stats: StatsOverview | null) {
  return [
    { label: "Active Alerts", value: stats?.activeAlerts, delta: "live" },
    { label: "Vessels Tracked", value: stats?.vesselsTracked, delta: `${stats?.windowHours ?? 24}h` },
    { label: "Dark Vessels", value: stats?.darkVessels, delta: "AIS gap" },
    { label: "Open Cases", value: stats?.openCases, delta: "semua agency" },
  ]
}

function StatsGrid({ items }: { items: ReturnType<typeof statItems> }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border-fog bg-hull rounded-sm border p-4">
          <div className="text-fathom text-xs">{item.label}</div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="font-data text-2xl font-semibold text-foam">
              {item.value === undefined ? "—" : formatter.format(item.value)}
            </div>
            <div className="font-data text-[0.6875rem] uppercase text-territory">{item.delta}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
