"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { Toaster } from "sonner"

const AlertLiveSubscriber = dynamic(
  () => import("@/features/alerts/components/alert-live-subscriber").then((m) => m.AlertLiveSubscriber),
  { ssr: false },
)

const AssistantPanel = dynamic(
  () => import("@/features/assistant/components/assistant-panel").then((m) => m.AssistantPanel),
  { ssr: false },
)

const OnboardingTour = dynamic(
  () => import("@/features/onboarding/components/onboarding-tour").then((m) => m.OnboardingTour),
  { ssr: false },
)

type TourMode = "first-run" | "replay"

export function DashboardRuntime({
  agencyId,
  tutorialCompletedAt,
}: {
  agencyId: string | null
  tutorialCompletedAt: string | null
}) {
  const [tourMode, setTourMode] = useState<TourMode | null>(null)

  useEffect(() => {
    if (tutorialCompletedAt !== null) return

    const frame = requestAnimationFrame(() => setTourMode("first-run"))
    return () => cancelAnimationFrame(frame)
  }, [tutorialCompletedAt])

  useEffect(() => {
    function replayTour() {
      setTourMode("replay")
    }

    window.addEventListener("siren:tutorial-replay", replayTour)
    return () => window.removeEventListener("siren:tutorial-replay", replayTour)
  }, [])

  return (
    <>
      <AlertLiveSubscriber agencyId={agencyId} />
      <AssistantPanel />
      {tourMode && <OnboardingTour mode={tourMode} onClose={() => setTourMode(null)} />}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: { background: "var(--trench)", border: "1px solid var(--fog)", color: "var(--foam)" },
        }}
      />
    </>
  )
}
