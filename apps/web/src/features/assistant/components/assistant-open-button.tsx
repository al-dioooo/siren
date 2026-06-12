"use client"

import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Tombol ✦ top bar — buka AssistantPanel (event; panel hidup di layout). */
export function AssistantOpenButton() {
  return (
    <Button
      data-tour="assistant"
      variant="ghost"
      size="icon-sm"
      aria-label="Buka asisten SIREN (⌘K)"
      onClick={() => window.dispatchEvent(new Event("siren:assistant-open"))}
    >
      <Sparkles className="text-signal-bright size-4" />
    </Button>
  )
}
