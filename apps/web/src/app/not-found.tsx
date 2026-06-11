import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="bg-abyss text-foam grid min-h-svh place-items-center p-6">
      <div className="border-fog bg-trench w-full max-w-md rounded-sm border px-6 py-12 text-center">
        <div className="font-data text-signal-bright mb-2 text-xs uppercase">404</div>
        <h1 className="font-display mb-1 text-lg font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-mist-t mb-5 text-sm">Tautan mungkin sudah berubah atau keliru.</p>
        <Button nativeButton={false} render={<Link href="/dashboard" />}>Kembali ke dashboard</Button>
      </div>
    </div>
  )
}
