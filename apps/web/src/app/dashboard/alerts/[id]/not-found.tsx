import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AlertNotFound() {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <h2 className="font-display mb-1 text-lg font-semibold">Alert tidak ditemukan</h2>
      <p className="text-mist-t mb-4 text-sm">
        Alert mungkin sudah dihapus atau tautannya keliru.
      </p>
      <Button nativeButton={false} render={<Link href="/dashboard/alerts" />}>Kembali ke queue</Button>
    </div>
  )
}
