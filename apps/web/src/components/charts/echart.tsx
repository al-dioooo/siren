"use client"

// ECharts modular (OPTIMIZATIONS.md §7.2 / plan 08 P3.1.2):
// import HANYA echarts/core + chart & komponen yang dipakai — hemat ~250KB.
import { useEffect, useRef } from "react"
import * as echarts from "echarts/core"
import { BarChart, LineChart, PieChart } from "echarts/charts"
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import type { EChartsCoreOption } from "echarts/core"
import { cn } from "@/lib/utils"

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

/** Token tema untuk chart — selaras DESIGN.md §3 (severity & aksen konsisten UI). */
export const CHART_COLORS = {
  signal: "#8b5cf6",
  signalBright: "#a78bfa",
  territory: "#22d3ee",
  ok: "#10b981",
  foam: "#e2e8f0",
  fathom: "#64748b",
  fog: "#1e293b",
  severity: { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#60a5fa" },
  agency: {
    PSDKP: "#8b5cf6",
    BAKAMLA: "#22d3ee",
    KKP: "#10b981",
    POLRI: "#eab308",
    TNI_AL: "#f97316",
  } as Record<string, string>,
} as const

const BASE_OPTION: EChartsCoreOption = {
  backgroundColor: "transparent",
  textStyle: { color: CHART_COLORS.fathom, fontFamily: "var(--font-data, monospace)" },
  tooltip: {
    backgroundColor: "#101a2b",
    borderColor: CHART_COLORS.fog,
    textStyle: { color: CHART_COLORS.foam, fontSize: 12 },
  },
}

export function EChart({ option, className }: { option: EChartsCoreOption; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption({ ...BASE_OPTION, ...option }, true)
  }, [option])

  return <div ref={ref} className={cn("h-72 w-full", className)} />
}
