import { DataRow, SectionPanel } from "@/components/shared"
import { getSessionOrRedirect } from "@/server/session"
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TutorialReplayButton } from "@/features/onboarding/components/tutorial-replay-button"

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
    <SectionPanel title="Akun" className="max-w-xl">
      <div className="grid grid-cols-2 gap-3">
        <DataRow label="Nama" value={user.name} />
        <DataRow label="Email" value={user.email} />
        <DataRow label="Role" value={user.role.toUpperCase()} />
        <DataRow label="Agency" value={user.agency ? `${user.agency.code} — ${user.agency.name}` : "—"} />
      </div>
      <div className="border-fog mt-4 flex items-center justify-between gap-3 border-t pt-4">
        <div>
          <div className="text-foam text-sm font-medium">Onboarding</div>
          <p className="text-mist-t text-xs">Ulangi walkthrough konsol tanpa mengubah status akun.</p>
        </div>
        <TutorialReplayButton />
      </div>
    </SectionPanel>
  )
}
