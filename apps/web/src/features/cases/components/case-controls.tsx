"use client"

import { useRef, useState, useTransition } from "react"
import { ArrowRightLeft, CheckCircle2, FileText, Paperclip, Play, XCircle } from "lucide-react"
import { toast } from "sonner"
import { AGENCY_CODES, ATTACHMENT_MAX_BYTES, type CaseStatus } from "@siren/shared/constants"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { addCaseNote, changeCaseStatus, handoffCase, uploadCaseAttachment } from "../actions/actions"

const TRANSITION_META: Record<CaseStatus, { label: string; icon: typeof Play }> = {
  opened: { label: "Buka kembali", icon: Play },
  in_progress: { label: "Mulai proses", icon: Play },
  resolved: { label: "Tandai selesai", icon: CheckCircle2 },
  closed: { label: "Tutup case", icon: XCircle },
}

/**
 * Kontrol case (plan 07 P3.1.3–P3.1.6): transisi status (hanya yang legal yang
 * ditawarkan), catatan, upload attachment, handoff agency, tombol PDF.
 */
export function CaseControls({
  caseId,
  agencyCode,
  allowedTransitions,
  pdfReady,
}: {
  caseId: string
  agencyCode: string
  allowedTransitions: CaseStatus[]
  pdfReady: boolean
}) {
  const [note, setNote] = useState("")
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [toAgency, setToAgency] = useState<string | null>(null)
  const [handoffReason, setHandoffReason] = useState("")
  const [pending, startTransition] = useTransition()
  const fileInput = useRef<HTMLInputElement>(null)

  function transition(toStatus: CaseStatus) {
    startTransition(async () => {
      const result = await changeCaseStatus(caseId, toStatus)
      if (result.ok) toast.success(`Status → ${toStatus.replace("_", " ")}`)
      else toast.error(result.error ?? "Transisi gagal")
    })
  }

  function submitNote() {
    const body = note.trim()
    if (!body) return
    startTransition(async () => {
      const result = await addCaseNote(caseId, body)
      if (result.ok) {
        toast.success("Catatan ditambahkan")
        setNote("")
      } else toast.error(result.error ?? "Catatan gagal disimpan")
    })
  }

  function submitFile(file: File) {
    if (file.size > ATTACHMENT_MAX_BYTES) {
      toast.error(`File melebihi batas ${ATTACHMENT_MAX_BYTES / 1024 / 1024}MB`)
      return
    }
    const formData = new FormData()
    formData.set("file", file)
    startTransition(async () => {
      const result = await uploadCaseAttachment(caseId, formData)
      if (result.ok) toast.success(`${file.name} terunggah`)
      else toast.error(result.error ?? "Upload gagal")
      if (fileInput.current) fileInput.current.value = ""
    })
  }

  function submitHandoff() {
    if (!toAgency || handoffReason.trim().length < 3) return
    startTransition(async () => {
      const result = await handoffCase(caseId, toAgency, handoffReason.trim())
      if (result.ok) {
        toast.success(`Case dialihkan ke ${toAgency}`)
        setHandoffOpen(false)
        setToAgency(null)
        setHandoffReason("")
      } else toast.error(result.error ?? "Handoff gagal")
    })
  }

  return (
    <div className="space-y-4">
      {/* Transisi status — hanya transisi legal yang punya tombol */}
      <div className="flex flex-wrap items-center gap-2">
        {allowedTransitions.map((to) => {
          const meta = TRANSITION_META[to]
          return (
            <Button key={to} disabled={pending} onClick={() => transition(to)}>
              <meta.icon className="size-4" />
              {meta.label}
            </Button>
          )
        })}
        <Button variant="outline" disabled={pending} onClick={() => setHandoffOpen(true)}>
          <ArrowRightLeft className="size-4" />
          Handoff
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => fileInput.current?.click()}>
          <Paperclip className="size-4" />
          Lampiran
        </Button>
        {pdfReady ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              // Download langsung dari endpoint API (auth via cookie, proxy rewrites)
              <a href={`/api/v1/cases/${encodeURIComponent(caseId)}/evidence.pdf`} />
            }
          >
            <FileText className="size-4" />
            Generate Evidence PDF
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <span>
                  <Button variant="outline" disabled>
                    <FileText className="size-4" />
                    Generate Evidence PDF
                  </Button>
                </span>
              }
            />
            <TooltipContent>Layanan PDF belum aktif</TooltipContent>
          </Tooltip>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) submitFile(file)
          }}
        />
      </div>

      {/* Catatan */}
      <div className="space-y-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tambah catatan perkembangan kasus..."
          className="bg-hull border-mist"
          maxLength={2000}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submitNote} disabled={pending || !note.trim()}>
            {pending ? "Menyimpan..." : "Simpan catatan"}
          </Button>
        </div>
      </div>

      {/* Handoff dialog (plan 07 P3.1.5) */}
      <Dialog open={handoffOpen} onOpenChange={setHandoffOpen}>
        <DialogContent className="bg-trench border-fog sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Handoff Case</DialogTitle>
            <DialogDescription className="text-mist-t">
              Alihkan tanggung jawab case ke agency lain. Tercatat di timeline dan audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select
              items={AGENCY_CODES.filter((a) => a !== agencyCode).map((a) => ({ value: a, label: a }))}
              value={toAgency}
              onValueChange={(v) => setToAgency(v as string)}
            >
              <SelectTrigger className="bg-hull border-mist w-full">
                <SelectValue placeholder="Pilih agency tujuan" />
              </SelectTrigger>
              <SelectContent>
                {AGENCY_CODES.filter((a) => a !== agencyCode).map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={handoffReason}
              onChange={(e) => setHandoffReason(e.target.value)}
              placeholder="Alasan handoff (wajib)"
              className="bg-hull border-mist"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHandoffOpen(false)} disabled={pending}>
              Batal
            </Button>
            <Button onClick={submitHandoff} disabled={pending || !toAgency || handoffReason.trim().length < 3}>
              {pending ? "Memproses..." : "Handoff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
