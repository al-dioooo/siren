"use client"

import { useState } from "react"
import Link from "next/link"
import { BellRing } from "lucide-react"
import { toast } from "sonner"
import {
  RULE_LABELS,
  RULE_TYPES,
  SEVERITIES,
  type RuleType,
  type Severity,
} from "@siren/shared/constants"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TestVessel } from "../types"

/** Injeksi alert sintetis — menguji realtime feed, toast, dan sonar ping. */
export function AlertInjector({ vessels }: { vessels: TestVessel[] }) {
  const [vesselId, setVesselId] = useState<string | null>(null)
  const [ruleType, setRuleType] = useState<RuleType>("zone_violation")
  const [severity, setSeverity] = useState<Severity>("high")
  const [busy, setBusy] = useState(false)
  const [last, setLast] = useState<{ id: string; agencyCode: string } | null>(null)

  async function inject() {
    if (!vesselId) return
    setBusy(true)
    try {
      const res = await fetch("/api/v1/console/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vesselId, ruleType, severity }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? "Injeksi alert gagal")
        return
      }
      const data = (await res.json()) as { id: string; agencyCode: string }
      setLast(data)
      toast.success(`Alert uji dibuat → ${data.agencyCode}`, {
        description: RULE_LABELS[ruleType],
      })
    } finally {
      setBusy(false)
    }
  }

  const vesselItems = [
    { value: null as string | null, label: "Pilih kapal uji" },
    ...vessels.map((v) => ({ value: v.id as string | null, label: `${v.name ?? "Tanpa nama"} · ${v.mmsi}` })),
  ]
  const ruleItems = RULE_TYPES.map((r) => ({ value: r as string | null, label: RULE_LABELS[r] }))
  const severityItems = SEVERITIES.map((s) => ({ value: s as string | null, label: s }))

  return (
    <section className="border-fog bg-trench rounded-sm border">
      <header className="border-fog flex h-12 items-center gap-2 border-b px-4">
        <BellRing className="text-signal-bright size-4" />
        <h2 className="font-display text-sm font-semibold">Injeksi Alert</h2>
      </header>

      <div className="space-y-2 p-4">
        <Select
          items={vesselItems}
          value={vesselId}
          onValueChange={(v) => setVesselId(v as string | null)}
        >
          <SelectTrigger size="sm" className="bg-hull border-mist h-8 w-full text-xs">
            <SelectValue placeholder="Pilih kapal uji" />
          </SelectTrigger>
          <SelectContent>
            {vesselItems.map((o) => (
              <SelectItem key={o.value ?? "__none"} value={o.value} className="font-data text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select items={ruleItems} value={ruleType} onValueChange={(v) => setRuleType(v as RuleType)}>
            <SelectTrigger size="sm" className="bg-hull border-mist h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ruleItems.map((o) => (
                <SelectItem key={o.value} value={o.value} className="font-data text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select items={severityItems} value={severity} onValueChange={(v) => setSeverity(v as Severity)}>
            <SelectTrigger size="sm" className="bg-hull border-mist h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {severityItems.map((o) => (
                <SelectItem key={o.value} value={o.value} className="font-data text-xs uppercase">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button size="sm" disabled={!vesselId || busy} onClick={() => void inject()}>
          {busy ? "Memproses..." : "Inject alert"}
        </Button>

        {last && (
          <p className="font-data text-mist-t text-xs">
            Alert terakhir →{" "}
            <Link href={`/dashboard/alerts/${last.id}`} className="text-signal-bright hover:underline">
              buka detail
            </Link>{" "}
            · routing {last.agencyCode}
          </p>
        )}
        <p className="text-fathom text-xs">
          Alert tampil instan via realtime (toast + sonar ping di peta). Operator scope &quot;Agency
          Saya&quot; hanya melihat alert yang dirouting ke agency-nya.
        </p>
      </div>
    </section>
  )
}
