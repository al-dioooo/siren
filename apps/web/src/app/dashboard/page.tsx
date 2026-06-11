import { Suspense } from "react"
import { MapShell } from "@/components/map/map-shell"
import { StatsStrip, StatsStripSkeleton } from "@/components/dashboard/stats-strip"
import { SeverityChip, StatusBadge } from "@/components/siren"

// Placeholder feed statis — diganti AlertFeed realtime di Blok C (plan 03 Stage 4)
const feed = [
  {
    id: "ALT-8217",
    vessel: "KM Samudra Raya",
    mmsi: "525021234",
    rule: "Pelanggaran Zona",
    zone: "WPP-711",
    severity: "critical" as const,
    status: "new" as const,
    time: "2 menit lalu",
  },
  {
    id: "ALT-8209",
    vessel: "FV Northern Light",
    mmsi: "440938120",
    rule: "AIS Gap",
    zone: "ZEE Natuna",
    severity: "high" as const,
    status: "dispatched" as const,
    time: "14 menit lalu",
  },
  {
    id: "ALT-8198",
    vessel: "MT Merapi",
    mmsi: "525009812",
    rule: "Loitering MPA",
    zone: "Raja Ampat",
    severity: "medium" as const,
    status: "in_progress" as const,
    time: "31 menit lalu",
  },
]

export default function DashboardPage() {
  return (
    <div className="grid min-h-[calc(100svh-5.5rem)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-4">
        <Suspense fallback={<StatsStripSkeleton />}>
          <StatsStrip />
        </Suspense>

        <MapShell className="min-h-[560px]" />
      </section>

      <aside className="border-fog bg-trench rounded-sm border">
        <div className="border-fog flex h-12 items-center justify-between border-b px-4">
          <div>
            <h2 className="font-display text-sm font-semibold">Alert Feed</h2>
            <p className="font-data text-fathom text-[0.6875rem] uppercase">Agency Saya</p>
          </div>
          <span className="bg-signal live-pulse size-2 rounded-full" />
        </div>

        <div className="divide-fog divide-y">
          {feed.map((item) => (
            <a
              key={item.id}
              href="/dashboard/alerts"
              className="hover:bg-deck/60 block p-4 transition-colors"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <SeverityChip severity={item.severity} />
                <span className="font-data text-fathom text-[0.6875rem]">{item.time}</span>
              </div>
              <div className="text-foam truncate text-sm font-medium">{item.vessel}</div>
              <div className="font-data text-fathom mt-1 text-xs">MMSI {item.mmsi}</div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-mist-t truncate text-xs">
                  {item.rule} · {item.zone}
                </span>
                <StatusBadge status={item.status} />
              </div>
            </a>
          ))}
        </div>
      </aside>
    </div>
  )
}
