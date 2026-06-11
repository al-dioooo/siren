import { Suspense } from "react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiFetch } from "@/server/api"
import { VesselSearch } from "./vessel-search"

type VesselRow = {
  id: string
  mmsi: string
  imo: string | null
  name: string | null
  flag: string | null
  vesselType: string | null
  licensedWpp: string | null
  alertCount: number
}

export default function VesselsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Vessels</h1>
        <p className="text-mist-t text-sm">Registry kapal terpantau — identitas, izin, dan riwayat alert.</p>
      </header>
      <VesselSearch />
      <Suspense fallback={<VesselsSkeleton />}>
        <VesselsTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function VesselsTable({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (typeof params.q === "string" && params.q) qs.set("q", params.q)
  if (typeof params.cursor === "string" && params.cursor) qs.set("cursor", params.cursor)

  const res = await apiFetch(`/api/v1/vessels?${qs}`)
  if (!res.ok) return <VesselsEmpty text="Registry tidak dapat dimuat — coba muat ulang halaman." />

  const { vessels, nextCursor } = (await res.json()) as {
    vessels: VesselRow[]
    nextCursor: string | null
  }
  if (vessels.length === 0) {
    return <VesselsEmpty text="Tidak ada kapal yang cocok dengan pencarian." />
  }

  const nextParams = new URLSearchParams()
  if (typeof params.q === "string" && params.q) nextParams.set("q", params.q)
  if (nextCursor) nextParams.set("cursor", nextCursor)

  return (
    <div className="border-fog bg-trench overflow-x-auto rounded-sm border">
      <Table>
        <TableHeader>
          <TableRow className="border-fog hover:bg-transparent">
            <TableHead>Kapal</TableHead>
            <TableHead>MMSI</TableHead>
            <TableHead>Bendera</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>Izin WPP</TableHead>
            <TableHead className="text-right">Alerts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vessels.map((v) => (
            <TableRow key={v.id} className="border-fog hover:bg-deck/60 relative">
              <TableCell>
                <Link
                  href={`/dashboard/vessels/${v.id}`}
                  className="text-foam after:absolute after:inset-0 text-sm font-medium hover:underline"
                >
                  {v.name ?? `MMSI ${v.mmsi}`}
                </Link>
              </TableCell>
              <TableCell className="font-data text-mist-t text-sm">{v.mmsi}</TableCell>
              <TableCell className="font-data text-mist-t text-sm">{v.flag ?? "—"}</TableCell>
              <TableCell className="text-mist-t text-sm">{v.vesselType ?? "—"}</TableCell>
              <TableCell className="font-data text-mist-t text-sm">{v.licensedWpp ?? "—"}</TableCell>
              <TableCell className="text-right">
                {v.alertCount > 0 ? (
                  <span className="border-sev-high/40 text-sev-high font-data rounded-sm border px-1.5 py-0.5 text-xs">
                    {v.alertCount}
                  </span>
                ) : (
                  <span className="text-fathom text-xs">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {nextCursor && (
        <div className="border-fog flex justify-center border-t p-3">
          <Link
            href={`/dashboard/vessels?${nextParams}`}
            className="font-data text-signal-bright text-xs uppercase hover:underline"
          >
            Muat 50 berikutnya →
          </Link>
        </div>
      )}
    </div>
  )
}

function VesselsEmpty({ text }: { text: string }) {
  return (
    <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
      <p className="text-mist-t text-sm">{text}</p>
    </div>
  )
}

function VesselsSkeleton() {
  return (
    <div className="border-fog bg-trench space-y-3 rounded-sm border p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
