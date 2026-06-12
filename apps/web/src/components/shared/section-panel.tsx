import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Panel konsol standar: border kabut + latar trench + judul uppercase. */
export function SectionPanel({
  title,
  children,
  className,
}: {
  title?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("border-fog bg-trench rounded-sm border p-4", className)}>
      {title && (
        <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      )}
      {children}
    </section>
  )
}

/** Teks empty-state standar untuk daftar kosong. */
export function EmptyText({ children }: { children: ReactNode }) {
  return <p className="text-mist-t text-sm">{children}</p>
}
