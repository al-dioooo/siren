import { ExternalLink } from "lucide-react"
import { EmptyText, SectionPanel } from "@/components/shared"
import type { AlertDetail } from "../alert-types"

export function AlertCitations({ citations }: { citations: AlertDetail["citations"] }) {
  return (
    <SectionPanel title="Dasar Hukum">
      {citations.length === 0 ? (
        <EmptyText>Tidak ada kutipan pasal untuk rule ini.</EmptyText>
      ) : (
        <div className="space-y-2">
          {citations.map((ct) => (
            <details key={ct.lawRef} className="border-fog group rounded-sm border">
              <summary className="hover:bg-deck/60 flex cursor-pointer items-center justify-between gap-2 p-3">
                <span>
                  <span className="font-data text-signal-bright text-xs uppercase">{ct.lawRef}</span>
                  <span className="text-foam block text-sm">{ct.title}</span>
                </span>
                <span className="text-fathom text-xs group-open:rotate-180">▾</span>
              </summary>
              <div className="border-fog border-t p-3">
                <p className="text-mist-t text-sm leading-relaxed whitespace-pre-line">{ct.body}</p>
                <a
                  href={ct.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-data text-signal-bright mt-2 inline-flex items-center gap-1 text-xs uppercase hover:underline"
                >
                  Sumber <ExternalLink className="size-3" />
                </a>
              </div>
            </details>
          ))}
        </div>
      )}
    </SectionPanel>
  )
}
