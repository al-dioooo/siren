"use client"

import { useState, useTransition } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { dispatchAlert } from "../actions/actions"

/** Quick dispatch dari baris queue (plan 07 P2.1.3) — konfirmasi → Server Action. */
export function QuickDispatch({ alertId, vesselLabel }: { alertId: string; vesselLabel: string }) {
  const [open, setOpen] = useState(false)
  const [needsHandoff, setNeedsHandoff] = useState(false)
  const [pending, startTransition] = useTransition()

  function run(confirmHandoff: boolean) {
    startTransition(async () => {
      const result = await dispatchAlert(alertId, confirmHandoff)
      if (result.ok) {
        toast.success(`Case ${result.caseCode} dibuka`, { description: vesselLabel })
        setOpen(false)
        setNeedsHandoff(false)
      } else if (result.code === "handoff_required") {
        setNeedsHandoff(true)
      } else {
        toast.error(result.error ?? "Dispatch gagal")
        setOpen(false)
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <Send className="size-3.5" />
        Dispatch
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setNeedsHandoff(false) }}>
        <DialogContent className="bg-trench border-fog sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="font-display">
              {needsHandoff ? "Konfirmasi Handoff" : "Dispatch Alert"}
            </DialogTitle>
            <DialogDescription className="text-mist-t">
              {needsHandoff
                ? "Alert ini milik agency lain. Dispatch akan membuka case atas nama agency Anda — lanjutkan handoff?"
                : `Buka case penindakan untuk ${vesselLabel}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={() => run(needsHandoff)} disabled={pending}>
              {pending ? "Memproses..." : needsHandoff ? "Ya, handoff & dispatch" : "Dispatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
