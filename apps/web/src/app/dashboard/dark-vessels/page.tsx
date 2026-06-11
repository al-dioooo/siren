import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/server/api"
import { formatDateTime, relativeTime } from "@/lib/relative-time"

type DarkVessel = {
  vessel: { id: string; mmsi: string; name: string | null; flag: string | null; vesselType: string | null }
  gapHours: number
  lastSeenAt: string
  resumeAt: string
  lastKnownPosition: { lat: number; lng: number }
}

/** Thumbnail Mapbox Static Images (plan 08 P1.2.2) — murah render, tanpa WebGL per baris. */
function staticMapUrl(lat: number, lng: number): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token || !token.startsWith("pk.")) return null
  return `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+8b5cf6(${lng.toFixed(4)},${lat.toFixed(4)})/${lng.toFixed(4)},${lat.toFixed(4)},5,0/200x120@2x?access_token=${token}&attribution=false&logo=false`
}

export default function DarkVesselsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Dark Vessels</h1>
        <p className="text-mist-t text-sm">
          Kapal dengan AIS gap &gt; 4 jam dalam 7 hari terakhir — kandidat pemantauan intensif.
        </p>
      </header>
      <Suspense fallback={<DarkSkeleton />}>
        <DarkVesselList />
      </Suspense>
    </div>
  )
}

async function DarkVesselList() {
  const res = await apiFetch("/api/v1/dark-vessels")
  if (!res.ok) {
    return <DarkEmpty text="Daftar dark vessels tidak dapat dimuat — coba muat ulang halaman." />
  }
  const { darkVessels } = (await res.json()) as { darkVessels: DarkVessel[] }

  if (darkVessels.length === 0) {
    return <DarkEmpty text="Tidak ada kapal gelap terdeteksi pada 7 hari terakhir." />
  }

  return (
    <div className="space-y-3">
      {darkVessels.map((d) => {
        const mapUrl = staticMapUrl(d.lastKnownPosition.lat, d.lastKnownPosition.lng)
        return (
          <Link
            key={d.vessel.id}
            href={`/dashboard/vessels/${d.vessel.id}`}
            className="border-fog bg-trench hover:border-signal/50 flex flex-wrap items-center gap-4 rounded-sm border p-4 transition-colors"
          >
            {mapUrl ? (
              <Image
                src={mapUrl}
                alt={`Posisi terakhir ${d.vessel.name ?? d.vessel.mmsi}`}
                width={200}
                height={120}
                className="border-fog rounded-sm border"
                unoptimized
              />
            ) : (
              <div className="border-fog bg-deck grid h-[120px] w-[200px] place-items-center rounded-sm border">
                <span className="font-data text-fathom text-xs">peta off</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-foam text-sm font-medium">
                {d.vessel.name ?? `MMSI ${d.vessel.mmsi}`}
              </div>
              <div className="font-data text-fathom text-xs">
                MMSI {d.vessel.mmsi}
                {d.vessel.flag ? ` · ${d.vessel.flag}` : ""}
                {d.vessel.vesselType ? ` · ${d.vessel.vesselType}` : ""}
              </div>
              <div className="font-data text-fathom mt-2 text-xs">
                Terakhir terlihat {relativeTime(d.lastSeenAt)} · {formatDateTime(d.lastSeenAt)}
              </div>
              <div className="font-data text-fathom text-xs">
                {d.lastKnownPosition.lat.toFixed(4)}, {d.lastKnownPosition.lng.toFixed(4)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-data text-sev-critical text-2xl font-semibold">
                {d.gapHours}
                <span className="text-sm font-normal"> jam</span>
              </div>
              <div className="font-data text-fathom text-xs uppercase">durasi gelap</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function DarkEmpty({ text }: { text: string }) {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <div className="bg-deck mx-auto mb-3 grid size-10 place-items-center rounded-sm">
        <span className="bg-ok size-2 rounded-full" />
      </div>
      <p className="text-mist-t text-sm">{text}</p>
    </div>
  )
}

function DarkSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full" />
      ))}
    </div>
  )
}
