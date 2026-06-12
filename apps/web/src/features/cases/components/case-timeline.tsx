import { ArrowRightLeft, MessageSquare, Paperclip } from "lucide-react"
import { EmptyText } from "@/components/shared"
import { formatDateTime } from "@/lib/relative-time"
import type { CaseDetail } from "../case-types"

export function CaseTimeline({
  updates,
  attachments,
}: {
  updates: CaseDetail["updates"]
  attachments: CaseDetail["attachments"]
}) {
  if (updates.length === 0) {
    return <EmptyText>Belum ada aktivitas pada case ini.</EmptyText>
  }

  return (
    <ol className="space-y-4">
      {updates.map((u) => (
        <TimelineEntry key={u.id} update={u} attachments={attachments} />
      ))}
    </ol>
  )
}

function TimelineEntry({
  update,
  attachments,
}: {
  update: CaseDetail["updates"][number]
  attachments: CaseDetail["attachments"]
}) {
  const icon =
    update.kind === "status_change" ? (
      <span className="bg-signal mt-1 size-2 rounded-full" />
    ) : update.kind === "handoff" ? (
      <ArrowRightLeft className="text-territory mt-0.5 size-3.5" />
    ) : update.kind === "attachment" ? (
      <Paperclip className="text-fathom mt-0.5 size-3.5" />
    ) : (
      <MessageSquare className="text-fathom mt-0.5 size-3.5" />
    )

  const attachment =
    update.kind === "attachment" && update.body
      ? attachments.find((a) => a.fileName === update.body)
      : undefined

  return (
    <li className="flex items-start gap-3">
      <span className="grid w-4 shrink-0 place-items-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-foam text-sm">
          {update.kind === "status_change" ? (
            <>
              Status <span className="font-data text-xs uppercase">{update.fromStatus}</span> →{" "}
              <span className="font-data text-signal-bright text-xs uppercase">{update.toStatus}</span>
              {update.body && <span className="text-mist-t"> — {update.body}</span>}
            </>
          ) : update.kind === "attachment" ? (
            attachment?.url ? (
              <a href={attachment.url} target="_blank" rel="noreferrer" className="hover:underline">
                Lampiran: {update.body}
              </a>
            ) : (
              <>Lampiran: {update.body}</>
            )
          ) : (
            update.body
          )}
        </div>
        <div className="font-data text-fathom text-xs">
          {update.authorName} · {formatDateTime(update.createdAt)}
        </div>
      </div>
    </li>
  )
}
