import { Suspense } from "react"
import { MapShell } from "@/features/map/components/map-shell"
import { AlertFeed, AlertFeedSkeleton } from "@/features/alerts/components/alert-feed"
import { StatsStrip, StatsStripSkeleton } from "@/features/dashboard/components/stats-strip"

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="grid min-h-[calc(100svh-5.5rem)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-4">
        <Suspense fallback={<StatsStripSkeleton />}>
          <StatsStrip />
        </Suspense>

        <MapShell className="min-h-[560px]" />
      </section>

      <Suspense fallback={<AlertFeedSkeleton />}>
        <AlertFeed searchParams={searchParams} limit={10} />
      </Suspense>
    </div>
  )
}
