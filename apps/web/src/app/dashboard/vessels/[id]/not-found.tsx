import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function VesselNotFound() {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <h2 className="font-display mb-1 text-lg font-semibold">Kapal tidak ditemukan</h2>
      <p className="text-mist-t mb-4 text-sm">Kapal mungkin belum terdaftar atau tautannya keliru.</p>
      <Button nativeButton={false} render={<Link href="/dashboard/vessels" />}>Kembali ke registry</Button>
    </div>
  )
}
