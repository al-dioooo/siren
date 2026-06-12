"use client"

import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function TutorialReplayButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.dispatchEvent(new Event("siren:tutorial-replay"))}
    >
      <RotateCcw className="size-4" />
      Lihat tutorial
    </Button>
  )
}
