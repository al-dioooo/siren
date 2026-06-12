import { Suspense } from "react"
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
      <aside className="bg-trench border-fog hidden w-60 border-r lg:block" />
      <main className="flex flex-1 items-center justify-center">
        <div className="font-data text-fathom text-xs uppercase">Memuat konsol...</div>
      </main>
    </div>
  )
}
