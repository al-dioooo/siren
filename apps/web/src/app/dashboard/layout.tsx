import { Suspense } from "react"
import { Radio } from "lucide-react"
import { AssistantOpenButton } from "@/features/assistant/components/assistant-open-button"
import { LiveIndicator } from "@/features/alerts/components/live-indicator"
import { NlSearch } from "@/features/alerts/components/nl-search"
import { ScopeToggle } from "@/features/alerts/components/scope-toggle"
import { DashboardRuntime } from "@/components/shared/dashboard-runtime"
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell"
import { getSessionOrRedirect } from "@/server/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  )
}

async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  const user = await getSessionOrRedirect()

  return (
    <DashboardShell
      user={user}
      search={<NlSearch />}
      headerActions={
        <>
          <LiveIndicator />
          <ScopeToggle />
          <AssistantOpenButton />
        </>
      }
    >
      {children}
      <DashboardRuntime
        agencyId={user.agency?.id ?? null}
        tutorialCompletedAt={user.tutorialCompletedAt}
      />
    </DashboardShell>
  )
}

function DashboardFallback() {
  return (
    <div className="bg-abyss text-foam flex min-h-svh">
      <aside className="bg-trench/95 border-fog hidden w-60 shrink-0 border-r lg:flex lg:flex-col">
        <div className="border-fog flex h-16 items-center gap-3 border-b px-5">
          <div className="border-signal/50 bg-signal/10 relative grid size-8 place-items-center rounded-sm border">
            <span className="bg-signal size-2 rounded-full" />
            <span className="sonar-ping absolute size-8" />
          </div>
          <div>
            <div className="font-display text-foam text-lg font-semibold">SIREN</div>
            <div className="font-data text-fathom text-[0.65rem] uppercase">
              Command Console
            </div>
          </div>
        </div>
        <nav aria-hidden="true" className="flex flex-1 flex-col gap-6 px-3 py-4">
          <div className="space-y-2">
            <div className="font-data px-3 text-[0.6875rem] uppercase text-fathom">
              Operasional
            </div>
            <div className="space-y-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex h-10 items-center gap-3 rounded-sm px-3">
                  <span className="bg-fog block size-4 rounded-sm" />
                  <span className="bg-fog block h-3 w-28 rounded-sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <div className="font-data px-3 text-[0.6875rem] uppercase text-fathom">
              Utilitas
            </div>
            <div className="space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex h-10 items-center gap-3 rounded-sm px-3">
                  <span className="bg-fog block size-4 rounded-sm" />
                  <span className="bg-fog block h-3 w-24 rounded-sm" />
                </div>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-fog bg-abyss/90 flex h-14 shrink-0 items-center justify-end gap-3 border-b px-4 backdrop-blur md:px-6">
          <div className="border-fog ml-1 hidden h-8 items-center gap-2 border-l pl-3 lg:flex">
            <div className="bg-deck grid size-7 place-items-center rounded-sm">
              <Radio className="text-territory size-3.5" />
            </div>
            <div className="space-y-1">
              <span className="bg-fog block h-3 w-24 rounded-sm" />
              <span className="bg-fog block h-2 w-32 rounded-sm" />
            </div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-4 md:p-6">
          <div className="font-data text-fathom text-xs uppercase">Memuat konsol...</div>
        </main>
      </div>
    </div>
  )
}
