import { Skeleton } from "@/components/ui/skeleton"

export default function CasesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-8 w-full max-w-md" />
      <div className="border-fog bg-trench space-y-3 rounded-sm border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}
