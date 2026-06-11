import { Suspense } from "react"
import { Toaster } from "sonner"
import { AssistantPanel } from "@/components/assistant/assistant-panel"
import { AlertLiveSubscriber } from "@/components/dashboard/alert-live-subscriber"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
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
    <DashboardShell user={user}>
      {children}
      <AlertLiveSubscriber agencyId={user.agency?.id ?? null} />
      <AssistantPanel />
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: { background: "var(--trench)", border: "1px solid var(--fog)", color: "var(--foam)" },
        }}
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
