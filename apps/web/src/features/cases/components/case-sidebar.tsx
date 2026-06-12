import Link from "next/link"
import Image from "next/image"
import { FileDown } from "lucide-react"
import { RULE_LABELS, type RuleType } from "@siren/shared/constants"
import { DataRow, EmptyText, SectionPanel, SeverityChip } from "@/components/shared"
import { formatDateTime } from "@/lib/relative-time"
import type { CaseDetail } from "../case-types"

export function LinkedAlertCard({ alert }: { alert: CaseDetail["alert"] }) {
  return (
    <Link
      href={`/dashboard/alerts/${alert.id}`}
      className="border-fog bg-trench hover:border-signal/50 block rounded-sm border p-4 transition-colors"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Alert Asal</h2>
        <SeverityChip severity={alert.severity} />
      </div>
      <p className="text-foam text-sm">
        {RULE_LABELS[alert.ruleType as RuleType] ?? alert.ruleType}
      </p>
      <p className="font-data text-fathom mt-1 text-xs">
        {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)} · {formatDateTime(alert.createdAt)}
      </p>
      <span className="font-data text-signal-bright mt-2 inline-block text-xs uppercase">
        Buka alert detail →
      </span>
    </Link>
  )
}

export function CaseVesselCard({ vessel }: { vessel: CaseDetail["vessel"] }) {
  return (
    <SectionPanel title="Kapal">
      <div className="grid grid-cols-2 gap-3">
        <DataRow label="Nama" value={vessel.name ?? "—"} />
        <DataRow label="MMSI" value={vessel.mmsi} />
        <DataRow label="Bendera" value={vessel.flag ?? "—"} />
        <DataRow label="Tipe" value={vessel.vesselType ?? "—"} />
      </div>
      <Link
        href={`/dashboard/vessels/${vessel.id}`}
        className="font-data text-signal-bright mt-3 inline-block text-xs uppercase hover:underline"
      >
        Buka profil kapal →
      </Link>
    </SectionPanel>
  )
}

export function CaseAttachmentsCard({ attachments }: { attachments: CaseDetail["attachments"] }) {
  return (
    <SectionPanel title={`Lampiran (${attachments.length})`}>
      {attachments.length === 0 ? (
        <EmptyText>Belum ada lampiran.</EmptyText>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              {a.url && a.mimeType.startsWith("image/") ? (
                <Image
                  src={a.url}
                  alt={a.fileName}
                  width={40}
                  height={40}
                  className="border-fog size-10 rounded-sm border object-cover"
                />
              ) : (
                <span className="bg-deck grid size-10 place-items-center rounded-sm">
                  <FileDown className="text-fathom size-4" />
                </span>
              )}
              <span className="min-w-0">
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foam block truncate text-sm hover:underline"
                  >
                    {a.fileName}
                  </a>
                ) : (
                  <span className="text-foam block truncate text-sm">{a.fileName}</span>
                )}
                <span className="font-data text-fathom text-xs">
                  {(a.sizeBytes / 1024).toFixed(0)} KB · {a.uploaderName}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionPanel>
  )
}
