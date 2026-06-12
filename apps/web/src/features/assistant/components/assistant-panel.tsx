"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { DefaultChatTransport } from "ai"
import { useChat } from "@ai-sdk/react"
import { ExternalLink, RotateCcw, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type Citation = {
  lawRef: string
  title: string
  body: string
  sourceUrl: string
  similarity: number
}

const SUGGESTED_QUESTIONS = [
  "Apa hukuman illegal fishing kapal asing di ZEE?",
  "Apa sanksi mematikan AIS di perairan Indonesia?",
  "Apa beda kewenangan BAKAMLA dan PSDKP?",
]

/**
 * Asisten Hukum SIREN — slide-over global (plan 06 Module 2.2).
 * Buka via tombol ✦ top bar atau ⌘K. Bukan halaman — riwayat sesi bertahan
 * selama komponen hidup di layout.
 */
export function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/v1/chat" }),
  })
  const busy = status === "submitted" || status === "streaming"

  // ⌘K / Ctrl+K toggle dari halaman manapun
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Tombol ✦ di shell men-dispatch event ini (shell = Server Component)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener("siren:assistant-open", onOpen)
    return () => window.removeEventListener("siren:assistant-open", onOpen)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || busy) return
      clearError()
      void sendMessage({ text: trimmed })
      setInput("")
    },
    [busy, clearError, sendMessage],
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="bg-trench border-fog flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-fog border-b">
          <SheetTitle className="font-display flex items-center gap-2">
            <Sparkles className="text-signal-bright size-4" />
            Asisten Hukum SIREN
          </SheetTitle>
          <SheetDescription className="text-mist-t">
            Tanya regulasi perikanan & hukum laut — jawaban dengan rujukan pasal.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div ref={scrollRef} className="space-y-4 p-4">
            {messages.length === 0 && (
              <div className="space-y-3 pt-6">
                <p className="text-mist-t text-sm">Mulai dengan salah satu pertanyaan ini:</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => submit(q)}
                      className="border-fog bg-hull hover:border-signal/50 hover:text-foam text-mist-t rounded-sm border px-3 py-2 text-left text-xs transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => {
              const text = message.parts
                .filter((p) => p.type === "text")
                .map((p) => (p as { text: string }).text)
                .join("")
              const citations = message.parts.find((p) => p.type === "data-citations") as
                | { data: Citation[] }
                | undefined

              return (
                <div key={message.id} className="space-y-2">
                  <div
                    className={cn(
                      "rounded-sm px-3 py-2 text-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-signal/15 text-foam ml-8"
                        : "bg-hull border-fog text-foam mr-2 border",
                    )}
                  >
                    {text || (busy ? "…" : "")}
                  </div>
                  {citations && citations.data.length > 0 && message.role === "assistant" && (
                    <div className="mr-2 space-y-1.5">
                      {citations.data.slice(0, 3).map((ct) => (
                        <CitationCard key={ct.lawRef} citation={ct} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {busy && (
              <div className="text-fathom font-data flex items-center gap-2 text-xs">
                <span className="bg-signal live-pulse size-1.5 rounded-full" />
                Asisten sedang menyusun jawaban...
              </div>
            )}

            {error && (
              <div className="border-sev-high/40 bg-sev-high/10 space-y-2 rounded-sm border p-3">
                <p className="text-sev-high text-xs">
                  Asisten sibuk atau kuota sementara habis. Coba lagi sebentar lagi.
                </p>
                <Button variant="outline" size="sm" onClick={() => clearError()}>
                  <RotateCcw className="size-3.5" />
                  Coba lagi
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <form
          className="border-fog flex shrink-0 items-center gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit(input)
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya soal regulasi maritim..."
            className="bg-hull border-mist"
            disabled={busy}
          />
          <Button type="submit" size="icon-sm" disabled={busy || !input.trim()} aria-label="Kirim">
            <Send className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CitationCard({ citation }: { citation: Citation }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-fog bg-abyss/60 rounded-sm border">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="font-data text-territory text-xs">{citation.lawRef}</span>
        <span className="text-fathom text-[0.625rem]">{expanded ? "tutup" : "lihat pasal"}</span>
      </button>
      {expanded && (
        <div className="border-fog space-y-2 border-t px-3 py-2">
          <p className="text-mist-t text-xs leading-relaxed">{citation.body}</p>
          <a
            href={citation.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-signal-bright inline-flex items-center gap-1 text-[0.6875rem]"
          >
            Sumber resmi <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </div>
  )
}
