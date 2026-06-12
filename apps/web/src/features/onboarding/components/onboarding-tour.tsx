"use client"

import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TourMode = "first-run" | "replay"

type TourStep = {
  target: string
  eyebrow: string
  title: string
  body: string
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "alert-feed",
    eyebrow: "1 / 6",
    title: "Prioritas alert",
    body: "Feed ini menampilkan alert terbaru sesuai scope aktif. Mulai dari severity tertinggi, lalu buka detail untuk bukti dan tindakan.",
  },
  {
    target: "scope-toggle",
    eyebrow: "2 / 6",
    title: "Scope operasi",
    body: "Gunakan Agency Saya untuk kerja harian. Semua Agency membantu command lead melihat gambaran nasional.",
  },
  {
    target: "map-lod",
    eyebrow: "3 / 6",
    title: "Map LOD dan cluster",
    body: "Peta beralih dari heatmap ke cluster dan marker saat zoom. Layer WPP, EEZ, MPA, vessel, dan track bisa dinyalakan sesuai kebutuhan.",
  },
  {
    target: "feed-filters",
    eyebrow: "4 / 6",
    title: "Filter dan natural language",
    body: "Filter cepat menjaga queue tetap sempit. Kolom pencarian menerima kalimat seperti 'alert kritis minggu ini' dan mengubahnya menjadi query.",
  },
  {
    target: "assistant",
    eyebrow: "5 / 6",
    title: "AI assistant",
    body: "Buka assistant untuk bertanya soal alert, pasal, atau rencana respons. Jawaban memakai citation card agar dasar hukumnya bisa ditelusuri.",
  },
  {
    target: "nav",
    eyebrow: "6 / 6",
    title: "Navigasi operasi",
    body: "Pindah dari command map ke alert, case, vessel, analytics, audit, dan settings tanpa meninggalkan konteks sesi.",
  },
]

const HIGHLIGHT_PADDING = 8
const TOOLTIP_WIDTH = 360
const TOOLTIP_HEIGHT = 224

type Rect = {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

type Viewport = {
  width: number
  height: number
}

function getTourElement(target: string) {
  return document.querySelector<HTMLElement>(`[data-tour="${target}"]`)
}

function isVisibleRect(rect: DOMRect) {
  return rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.right > 0
}

async function persistCompletion() {
  let lastError: unknown

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch("/api/v1/me/tutorial-complete", { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return
    } catch (error) {
      lastError = error
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  console.warn("[tutorial] gagal menyimpan status selesai", lastError)
}

export function OnboardingTour({
  mode,
  onClose,
}: {
  mode: TourMode
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0 })
  const completedRef = useRef(false)
  const step = TOUR_STEPS[index]!

  const closeTour = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true
      if (mode === "first-run") void persistCompletion()
    }
    onClose()
  }, [mode, onClose])

  const goPrevious = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current >= TOUR_STEPS.length - 1) {
        queueMicrotask(closeTour)
        return current
      }
      return current + 1
    })
  }, [closeTour])

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    updateViewport()
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeTour()
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        goNext()
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        goPrevious()
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [closeTour, goNext, goPrevious])

  useEffect(() => {
    let active = true
    let resetFrame = 0
    let interval: ReturnType<typeof setInterval> | null = null

    function locate() {
      const element = getTourElement(step.target)
      if (!element) return false

      const firstRect = element.getBoundingClientRect()
      if (!isVisibleRect(firstRect)) return false

      element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" })
      requestAnimationFrame(() => {
        if (!active) return
        const nextRect = element.getBoundingClientRect()
        if (!isVisibleRect(nextRect)) return
        setRect({
          top: nextRect.top,
          right: nextRect.right,
          bottom: nextRect.bottom,
          left: nextRect.left,
          width: nextRect.width,
          height: nextRect.height,
        })
      })
      return true
    }

    resetFrame = requestAnimationFrame(() => {
      if (active) setRect(null)
    })
    if (!locate()) {
      interval = setInterval(() => {
        if (locate() && interval) {
          clearInterval(interval)
          interval = null
        }
      }, 100)
    }

    const timeout = setTimeout(() => {
      if (!active || locate()) return
      if (index >= TOUR_STEPS.length - 1) return
      goNext()
    }, 3000)

    return () => {
      active = false
      cancelAnimationFrame(resetFrame)
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [goNext, index, step.target])

  useEffect(() => {
    function refreshRect() {
      const element = getTourElement(step.target)
      if (!element) return
      const nextRect = element.getBoundingClientRect()
      if (!isVisibleRect(nextRect)) return
      setRect({
        top: nextRect.top,
        right: nextRect.right,
        bottom: nextRect.bottom,
        left: nextRect.left,
        width: nextRect.width,
        height: nextRect.height,
      })
    }

    window.addEventListener("scroll", refreshRect, true)
    window.addEventListener("resize", refreshRect)
    return () => {
      window.removeEventListener("scroll", refreshRect, true)
      window.removeEventListener("resize", refreshRect)
    }
  }, [step.target])

  const highlight = useMemo(() => {
    if (!rect) return null

    const top = Math.max(0, rect.top - HIGHLIGHT_PADDING)
    const left = Math.max(0, rect.left - HIGHLIGHT_PADDING)
    const right = Math.min(viewport.width, rect.right + HIGHLIGHT_PADDING)
    const bottom = Math.min(viewport.height, rect.bottom + HIGHLIGHT_PADDING)

    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    }
  }, [rect, viewport.height, viewport.width])

  const tooltipStyle = useMemo(() => {
    if (!highlight || viewport.width === 0 || viewport.height === 0) {
      return {
        left: 16,
        top: 16,
        width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))`,
      }
    }

    const maxLeft = Math.max(16, viewport.width - TOOLTIP_WIDTH - 16)
    const left = Math.min(Math.max(16, highlight.left), maxLeft)
    const hasSpaceBelow = highlight.bottom + TOOLTIP_HEIGHT + 16 < viewport.height
    const top = hasSpaceBelow
      ? highlight.bottom + 16
      : Math.max(16, highlight.top - TOOLTIP_HEIGHT - 16)

    return {
      left,
      top,
      width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 32px))`,
    }
  }, [highlight, viewport.height, viewport.width])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="siren-tour-title"
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {highlight ? (
        <>
          <div className="bg-abyss/75 fixed inset-x-0 top-0 pointer-events-auto" style={{ height: highlight.top }} />
          <div
            className="bg-abyss/75 fixed left-0 pointer-events-auto"
            style={{ top: highlight.top, width: highlight.left, height: highlight.height }}
          />
          <div
            className="bg-abyss/75 fixed right-0 pointer-events-auto"
            style={{ top: highlight.top, left: highlight.right, height: highlight.height }}
          />
          <div
            className="bg-abyss/75 fixed inset-x-0 bottom-0 pointer-events-auto"
            style={{ top: highlight.bottom }}
          />
          <div
            className="border-signal-bright shadow-[0_0_0_1px_var(--signal),0_0_28px_rgba(34,211,238,0.22)] fixed rounded-sm border-2"
            style={{
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
            }}
          />
        </>
      ) : (
        <div className="bg-abyss/75 fixed inset-0 pointer-events-auto" />
      )}

      <section
        className={cn(
          "border-fog bg-trench text-foam pointer-events-auto fixed rounded-sm border p-4 shadow-2xl",
          "focus:outline-none"
        )}
        style={tooltipStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-data text-signal-bright text-[0.6875rem] uppercase">
              {step.eyebrow}
            </div>
            <h2 id="siren-tour-title" className="font-display mt-1 text-base font-semibold">
              {step.title}
            </h2>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Tutup tutorial" onClick={closeTour}>
            <X className="size-4" />
          </Button>
        </div>

        <p className="text-mist-t text-sm leading-6">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={closeTour}>
            Lewati
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrevious} disabled={index === 0}>
              <ArrowLeft className="size-3.5" />
              Sebelumnya
            </Button>
            <Button size="sm" onClick={goNext}>
              {index === TOUR_STEPS.length - 1 ? "Selesai" : "Lanjut"}
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
