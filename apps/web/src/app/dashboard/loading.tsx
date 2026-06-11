import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="grid min-h-[calc(100svh-5.5rem)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="min-h-[560px] w-full" />
      </div>
      <Skeleton className="h-full min-h-64 w-full" />
    </div>
  )
}
