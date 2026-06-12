import { headers } from "next/headers"
import { RULE_LABELS, type AlertStatus, type RuleType, type Severity } from "@siren/shared/constants"
import { Skeleton } from "@/components/ui/skeleton"
import { SeverityChip, StatusBadge } from "@/components/shared"
import { FeedFilters } from "./feed-filters"

type FeedAlert = {
  id: string
  ruleType: string
  severity: Severity
  status: AlertStatus
  createdAt: string
  vessel: { name: string | null; mmsi: string; flag: string | null }
  agencyCode: string | null
}

const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "always" })

function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "baru saja"
  if (minutes < 60) return rtf.format(-minutes, "minute")
  if (minutes < 24 * 60) return rtf.format(-Math.round(minutes / 60), "hour")
  return rtf.format(-Math.round(minutes / (24 * 60)), "day")
}

const FEED_PARAMS = ["scope", "severity", "ruleType", "status", "since", "wppZone", "vesselQuery"] as const

/**
 * Feed alert (Server Component, streamed) — plan 03 P4.1.1/P4.1.2.
 * scope=mine default; mode all menampilkan chip agency pemilik.
 */
export async function AlertFeed({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const h = await headers()
  const qs = new URLSearchParams()
  for (const key of FEED_PARAMS) {
    const value = params[key]
    if (typeof value === "string" && value) qs.set(key, value)
  }

  const base = process.env.API_BASE_URL ?? "http://localhost:4000"
  const res = await fetch(`${base}/api/v1/alerts?${qs}`, {
    headers: { cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  })

  const scope = typeof params.scope === "string" ? params.scope : "mine"
  if (!res.ok) {
    return <FeedShell scope={scope}><FeedEmpty text="Feed tidak dapat dimuat." /></FeedShell>
  }

  const { alerts } = (await res.json()) as { alerts: FeedAlert[] }

  return (
    <FeedShell scope={scope}>
      {alerts.length === 0 ? (
        <FeedEmpty text="Perairan terpantau tenang — belum ada alert untuk filter ini." />
      ) : (
        <div className="divide-fog divide-y">
          {alerts.map((item) => (
            <a key={item.id} href={`/dashboard/alerts/${item.id}`} className="hover:bg-deck/60 block p-4 transition-colors">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SeverityChip severity={item.severity} />
                <span className="font-data text-fathom text-[0.6875rem]">{relativeTime(item.createdAt)}</span>
              </div>
              <div className="text-foam truncate text-sm font-medium">
                {item.vessel.name ?? `MMSI ${item.vessel.mmsi}`}
              </div>
              <div className="font-data text-fathom mt-1 text-xs">MMSI {item.vessel.mmsi}</div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-mist-t truncate text-xs">
                  {RULE_LABELS[item.ruleType as RuleType] ?? item.ruleType}
                </span>
                <span className="flex items-center gap-1.5">
                  {scope === "all" && item.agencyCode && (
                    <span className="border-territory/40 text-territory font-data rounded-sm border px-1.5 py-0.5 text-[0.625rem] uppercase">
                      {item.agencyCode}
                    </span>
                  )}
                  <StatusBadge status={item.status} />
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </FeedShell>
  )
}

function FeedShell({ scope, children }: { scope: string; children: React.ReactNode }) {
  return (
    <aside data-tour="alert-feed" className="border-fog bg-trench rounded-sm border">
      <div className="border-fog flex h-12 items-center justify-between border-b px-4">
        <div>
          <h2 className="font-display text-sm font-semibold">Alert Feed</h2>
          <p className="font-data text-fathom text-[0.6875rem] uppercase">
            {scope === "all" ? "Semua Agency" : "Agency Saya"}
          </p>
        </div>
        <FeedFilters />
      </div>
      {children}
    </aside>
  )
}

function FeedEmpty({ text }: { text: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="bg-deck mx-auto mb-3 grid size-10 place-items-center rounded-sm">
        <span className="bg-ok size-2 rounded-full" />
      </div>
      <p className="text-mist-t text-sm">{text}</p>
    </div>
  )
}

export function AlertFeedSkeleton() {
  return (
    <aside className="border-fog bg-trench rounded-sm border">
      <div className="border-fog flex h-12 items-center border-b px-4">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="divide-fog divide-y">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 p-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    </aside>
  )
}
