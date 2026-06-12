"use client"

// Tiga chart analytics (plan 08 P3.1.3) — dynamic import ssr:false agar chunk
// echarts terpisah dari initial JS.
import dynamic from "next/dynamic"
import { RULE_LABELS, type RuleType } from "@siren/shared/constants"
import { Skeleton } from "@/components/ui/skeleton"
import { CHART_COLORS } from "@/components/shared/echart"

const EChart = dynamic(() => import("@/components/shared/echart").then((m) => m.EChart), {
  ssr: false,
  loading: () => <Skeleton className="h-72 w-full" />,
})

export type DailyStatRow = {
  day: string
  agencyCode: string | null
  ruleType: string
  severity: string
  count: number
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-fog bg-trench rounded-sm border p-4">
      <h2 className="font-display mb-2 text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  )
}

function ChartEmpty() {
  return (
    <div className="grid h-72 place-items-center">
      <p className="text-mist-t text-sm">Tidak ada data pada rentang ini.</p>
    </div>
  )
}

export function AnalyticsCharts({ rows }: { rows: DailyStatRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Alert per Hari"><ChartEmpty /></ChartCard>
        <ChartCard title="Per Jenis Pelanggaran"><ChartEmpty /></ChartCard>
        <ChartCard title="Distribusi Agency"><ChartEmpty /></ChartCard>
      </div>
    )
  }

  // Line: total per hari
  const byDay = new Map<string, number>()
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.count)
  const days = [...byDay.keys()].sort()

  // Bar: total per rule type
  const byRule = new Map<string, number>()
  for (const r of rows) byRule.set(r.ruleType, (byRule.get(r.ruleType) ?? 0) + r.count)
  const rules = [...byRule.entries()].sort((a, b) => b[1] - a[1])

  // Pie: distribusi agency
  const byAgency = new Map<string, number>()
  for (const r of rows) {
    const key = r.agencyCode ?? "Tanpa agency"
    byAgency.set(key, (byAgency.get(key) ?? 0) + r.count)
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="Alert per Hari">
        <EChart
          option={{
            grid: { left: 40, right: 16, top: 24, bottom: 28 },
            xAxis: {
              type: "category",
              data: days,
              axisLine: { lineStyle: { color: CHART_COLORS.fog } },
              axisLabel: { color: CHART_COLORS.fathom, fontSize: 10 },
            },
            yAxis: {
              type: "value",
              splitLine: { lineStyle: { color: CHART_COLORS.fog } },
              axisLabel: { color: CHART_COLORS.fathom, fontSize: 10 },
            },
            tooltip: { trigger: "axis" },
            series: [
              {
                type: "line",
                data: days.map((d) => byDay.get(d) ?? 0),
                smooth: true,
                symbolSize: 6,
                lineStyle: { color: CHART_COLORS.signal, width: 2 },
                itemStyle: { color: CHART_COLORS.signalBright },
                areaStyle: { color: "rgba(139, 92, 246, 0.15)" },
              },
            ],
          }}
        />
      </ChartCard>

      <ChartCard title="Per Jenis Pelanggaran">
        <EChart
          option={{
            grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
            xAxis: {
              type: "value",
              splitLine: { lineStyle: { color: CHART_COLORS.fog } },
              axisLabel: { color: CHART_COLORS.fathom, fontSize: 10 },
            },
            yAxis: {
              type: "category",
              data: rules.map(([rule]) => RULE_LABELS[rule as RuleType] ?? rule).reverse(),
              axisLine: { lineStyle: { color: CHART_COLORS.fog } },
              axisLabel: { color: CHART_COLORS.foam, fontSize: 11 },
            },
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            series: [
              {
                type: "bar",
                data: rules.map(([, count]) => count).reverse(),
                barWidth: 16,
                itemStyle: { color: CHART_COLORS.territory, borderRadius: [0, 2, 2, 0] },
              },
            ],
          }}
        />
      </ChartCard>

      <ChartCard title="Distribusi Agency">
        <EChart
          option={{
            tooltip: { trigger: "item" },
            legend: {
              bottom: 0,
              textStyle: { color: CHART_COLORS.fathom, fontSize: 11 },
            },
            series: [
              {
                type: "pie",
                radius: ["45%", "70%"],
                center: ["50%", "45%"],
                label: { color: CHART_COLORS.foam, fontSize: 11 },
                data: [...byAgency.entries()].map(([agency, count]) => ({
                  name: agency,
                  value: count,
                  itemStyle: { color: CHART_COLORS.agency[agency] ?? CHART_COLORS.fathom },
                })),
              },
            ],
          }}
        />
      </ChartCard>
    </div>
  )
}
