import { Skeleton } from "@/components/ui/skeleton"

export default function VesselsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-9 w-80" />
      <div className="border-fog bg-trench space-y-3 rounded-sm border p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
