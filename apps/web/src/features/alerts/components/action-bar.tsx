"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Send, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { AGENCY_CODES, type AlertStatus } from "@siren/shared/constants"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { dispatchAlert, escalateAlert, markFalsePositive } from "../actions/actions"

type DialogKind = "dispatch" | "escalate" | "false_positive" | null

/**
 * Action bar alert detail (plan 07 P2.2.4): Dispatch / Escalate / False Positive.
 * Tombol disabled sesuai guard status API; lintas agency → dialog konfirmasi handoff.
 */
export function AlertActionBar({
  alertId,
  status,
  ownAgency,
  alertAgencyCode,
}: {
  alertId: string
  status: AlertStatus
  ownAgency: string | null
  alertAgencyCode: string | null
}) {
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [needsHandoff, setNeedsHandoff] = useState(false)
  const [reason, setReason] = useState("")
  const [toAgency, setToAgency] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const canDispatch = status === "new"
  const canMutate = status === "new" || status === "dispatched"
  const crossAgency = Boolean(alertAgencyCode && ownAgency && alertAgencyCode !== ownAgency)

  function close() {
    setDialog(null)
    setNeedsHandoff(false)
    setReason("")
    setToAgency(null)
  }

  function run(kind: Exclude<DialogKind, null>, confirmHandoff = false) {
    startTransition(async () => {
      const result =
        kind === "dispatch"
          ? await dispatchAlert(alertId, confirmHandoff)
          : kind === "escalate"
            ? await escalateAlert(alertId, toAgency ?? "", reason)
            : await markFalsePositive(alertId, reason)

      if (result.ok) {
        if (kind === "dispatch") {
          toast.success(`Case ${result.caseCode} dibuka`)
          if (result.caseId) router.push(`/dashboard/cases/${result.caseId}`)
        } else {
          toast.success(kind === "escalate" ? `Dieskalasi ke ${toAgency}` : "Ditandai false positive")
        }
        close()
      } else if (result.code === "handoff_required") {
        setNeedsHandoff(true)
      } else {
        toast.error(result.error ?? "Aksi gagal")
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={!canDispatch} onClick={() => setDialog("dispatch")}>
        <Send className="size-4" />
        Dispatch
      </Button>
      <Button variant="outline" disabled={!canMutate} onClick={() => setDialog("escalate")}>
        <ArrowUpRight className="size-4" />
        Escalate
      </Button>
      <Button
        variant="outline"
        className="text-fathom"
        disabled={!canMutate}
        onClick={() => setDialog("false_positive")}
      >
        <ShieldOff className="size-4" />
        False Positive
      </Button>

      <Dialog open={dialog !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="bg-trench border-fog sm:max-w-md">
          {dialog === "dispatch" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {needsHandoff || crossAgency ? "Dispatch (Handoff)" : "Dispatch Alert"}
                </DialogTitle>
                <DialogDescription className="text-mist-t">
                  {needsHandoff || crossAgency
                    ? `Alert ini milik ${alertAgencyCode}. Dispatch akan membuka case atas nama agency Anda — konfirmasi handoff lintas agency?`
                    : "Buka case penindakan untuk alert ini? Status alert menjadi `dispatched`."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={close} disabled={pending}>Batal</Button>
                <Button onClick={() => run("dispatch", needsHandoff || crossAgency)} disabled={pending}>
                  {pending ? "Memproses..." : needsHandoff || crossAgency ? "Konfirmasi handoff" : "Dispatch"}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog === "escalate" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Escalate Alert</DialogTitle>
                <DialogDescription className="text-mist-t">
                  Alihkan tanggung jawab alert ke agency lain dengan alasan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Select value={toAgency ?? undefined} onValueChange={setToAgency}>
                  <SelectTrigger className="bg-hull border-mist w-full">
                    <SelectValue placeholder="Pilih agency tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENCY_CODES.filter((a) => a !== alertAgencyCode).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Alasan eskalasi (wajib)"
                  className="bg-hull border-mist"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={close} disabled={pending}>Batal</Button>
                <Button onClick={() => run("escalate")} disabled={pending || !toAgency || reason.trim().length < 3}>
                  {pending ? "Memproses..." : "Escalate"}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog === "false_positive" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Tandai False Positive</DialogTitle>
                <DialogDescription className="text-mist-t">
                  Alert ditutup sebagai deteksi keliru. Alasan wajib untuk audit.
                </DialogDescription>
              </DialogHeader>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Alasan (wajib)"
                className="bg-hull border-mist"
              />
              <DialogFooter>
                <Button variant="ghost" onClick={close} disabled={pending}>Batal</Button>
                <Button
                  variant="destructive"
                  onClick={() => run("false_positive")}
                  disabled={pending || reason.trim().length < 3}
                >
                  {pending ? "Memproses..." : "Tandai False Positive"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
