import { Radio } from "lucide-react"
import type { ReactNode } from "react"
import { LogoutButton } from "@/app/dashboard/logout-button"
import type { SessionUser } from "@/server/session"
import { AssistantOpenButton } from "@/components/assistant/assistant-open-button"
import { DashboardNav } from "./dashboard-nav"
import { LiveIndicator } from "./live-indicator"
import { NlSearch } from "./nl-search"
import { ScopeToggle } from "./scope-toggle"

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser
  children: ReactNode
}) {
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
        <DashboardNav role={user.role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-fog bg-abyss/90 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
          <NlSearch />

          <div className="ml-auto flex items-center gap-2">
            <LiveIndicator />

            <ScopeToggle />

            <AssistantOpenButton />

            {/* Identitas disembunyikan <lg agar header muat di tablet (perf pass P2.2.3) */}
            <div className="border-fog ml-1 hidden h-8 items-center gap-2 border-l pl-3 lg:flex">
              <div className="bg-deck grid size-7 place-items-center rounded-sm">
                <Radio className="text-territory size-3.5" />
              </div>
              <div className="max-w-40 leading-tight">
                <div className="text-foam truncate text-xs font-medium">{user.name}</div>
                <div className="font-data text-fathom truncate text-[0.65rem] uppercase">
                  {user.agency?.code ?? "NO AGENCY"} · {user.role}
                </div>
              </div>
            </div>

            <LogoutButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
