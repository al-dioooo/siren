import { notFound } from "next/navigation"
import {
  ALERT_STATUSES,
  CASE_STATUSES,
  SEVERITIES,
} from "@siren/shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DataRow, SeverityChip, StatusBadge } from "@/components/siren"

const colorTokens = [
  "abyss", "trench", "hull", "deck", "fog", "mist",
  "signal", "signal-bright", "signal-deep", "territory",
  "foam", "mist-t", "fathom",
  "sev-critical", "sev-high", "sev-medium", "sev-low",
  "ok", "active", "idle",
] as const

const swatchClass: Record<(typeof colorTokens)[number], string> = {
  abyss: "bg-abyss", trench: "bg-trench", hull: "bg-hull", deck: "bg-deck",
  fog: "bg-fog", mist: "bg-mist", signal: "bg-signal",
  "signal-bright": "bg-signal-bright", "signal-deep": "bg-signal-deep",
  territory: "bg-territory", foam: "bg-foam", "mist-t": "bg-mist-t",
  fathom: "bg-fathom", "sev-critical": "bg-sev-critical", "sev-high": "bg-sev-high",
  "sev-medium": "bg-sev-medium", "sev-low": "bg-sev-low",
  ok: "bg-ok", active: "bg-active", idle: "bg-idle",
}

/** Galeri komponen dev-only (plan 03 P1.1.4) — bukan bagian rilis produksi. */
export default function ComponentsGallery() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <div className="bg-abyss text-foam min-h-svh space-y-10 p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold">SIREN Components</h1>
        <p className="text-mist-t text-sm">Galeri dev-only — verifikasi token & varian per DESIGN.md §3/§7</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Color Tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {colorTokens.map((token) => (
            <div key={token} className="border-fog rounded-sm border p-2">
              <div className={`${swatchClass[token]} border-fog h-12 rounded-sm border`} />
              <div className="font-data mt-2 text-[0.6875rem] text-mist-t">--{token}</div>
            </div>
          ))}
        </div>
        <div className="border-fog bg-trench space-y-1 rounded-sm border p-4">
          <p className="text-foam text-sm">foam di atas abyss/trench — target kontras ≥ 12:1</p>
          <p className="text-mist-t text-sm">mist-t di atas abyss/trench — target kontras ≥ 4.5:1</p>
          <p className="font-data text-fathom text-xs">fathom (label sekunder, non-teks-kritis)</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">SeverityChip</h2>
        <div className="flex flex-wrap gap-3">
          {SEVERITIES.map((s) => (
            <SeverityChip key={s} severity={s} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">StatusBadge — Alert</h2>
        <div className="flex flex-wrap gap-3">
          {ALERT_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
        <h2 className="font-display text-lg">StatusBadge — Case</h2>
        <div className="flex flex-wrap gap-3">
          {CASE_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">DataRow</h2>
        <div className="border-fog bg-hull grid max-w-md grid-cols-2 gap-3 rounded-sm border p-4">
          <DataRow label="MMSI" value="525021234" />
          <DataRow label="Zona" value="WPP-711" />
          <DataRow label="SOG" value="3.2 kn" />
          <DataRow label="Flag" value="IDN" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Card</h2>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>KM Samudra Raya</CardTitle>
            <CardDescription>Alert zone_violation · WPP-711</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <SeverityChip severity="critical" />
            <Button size="sm">Buka detail</Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg">Typography</h2>
        <div className="space-y-2">
          <p className="font-display text-xl">Space Grotesk — display (--font-display)</p>
          <p className="text-base">IBM Plex Sans — body (--font-body)</p>
          <p className="font-data text-sm">IBM Plex Mono — data 525021234 (--font-mono)</p>
        </div>
      </section>
    </div>
  )
}
