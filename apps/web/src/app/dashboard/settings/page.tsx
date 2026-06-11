import { DataRow } from "@/components/siren"
import { getSessionOrRedirect } from "@/server/session"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-semibold">Settings</h1>
        <p className="text-mist-t text-sm">Profil akun aktif. Preferensi lanjutan menyusul.</p>
      </header>
      <Suspense fallback={<Skeleton className="h-40 w-full max-w-xl" />}>
        <ProfileCard />
      </Suspense>
    </div>
  )
}

async function ProfileCard() {
  const user = await getSessionOrRedirect()
  return (
    <section className="border-fog bg-trench max-w-xl rounded-sm border p-4">
      <h2 className="font-display mb-3 text-sm font-semibold uppercase tracking-wide">Akun</h2>
      <div className="grid grid-cols-2 gap-3">
        <DataRow label="Nama" value={user.name} />
        <DataRow label="Email" value={user.email} />
        <DataRow label="Role" value={user.role.toUpperCase()} />
        <DataRow label="Agency" value={user.agency ? `${user.agency.code} — ${user.agency.name}` : "—"} />
      </div>
    </section>
  )
}
