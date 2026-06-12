import { Skeleton } from "@/components/ui/skeleton"

export function AlertDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}
