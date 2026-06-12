import { TerminalSquare } from "lucide-react"
import { getSessionOrRedirect } from "@/server/session"
import { ConsolePanels } from "@/features/console/components/console-panels"

export const metadata = { title: "Console — SIREN" }

/** Konsol pengujian admin — simulasi kapal, alert engine, injeksi alert, seed/reset. */
export default async function ConsolePage() {
  const session = await getSessionOrRedirect()

  if (session.role !== "admin") {
    return (
      <div className="border-fog bg-trench rounded-sm border px-4 py-16 text-center">
        <TerminalSquare className="text-fathom mx-auto mb-3 size-8" />
        <h2 className="font-display mb-1 text-lg font-semibold">Akses admin diperlukan</h2>
        <p className="text-mist-t text-sm">Console pengujian hanya tersedia untuk role admin.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold">Testing Console</h1>
        <p className="text-mist-t text-sm">
          Uji pergerakan kapal, alert engine, realtime feed, dan data demo. Semua data uji berprefix
          seed_ dan bisa dibersihkan kapan saja.
        </p>
      </div>
      <ConsolePanels />
    </div>
  )
}
