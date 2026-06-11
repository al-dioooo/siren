"use client"

import { Button } from "@/components/ui/button"

export default function AuditError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <h2 className="font-display mb-1 text-lg font-semibold">Audit log tidak dapat dimuat</h2>
      <p className="text-mist-t mb-4 text-sm">Terjadi gangguan saat menghubungi API. Coba lagi.</p>
      <Button onClick={() => reset()}>Muat ulang</Button>
    </div>
  )
}
