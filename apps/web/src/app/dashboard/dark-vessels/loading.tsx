import { Skeleton } from "@/components/ui/skeleton"

export default function DarkVesselsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    </div>
  )
}
