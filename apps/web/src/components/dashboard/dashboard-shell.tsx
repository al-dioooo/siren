import { ChevronDown, Radio, Search, Sparkles } from "lucide-react"
import type { ReactNode } from "react"
import { LogoutButton } from "@/app/dashboard/logout-button"
import type { SessionUser } from "@/server/session"
import { Button } from "@/components/ui/button"
import { DashboardNav } from "./dashboard-nav"

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
          <button className="border-fog bg-trench text-mist-t hover:text-foam hidden h-8 min-w-72 items-center gap-2 rounded-sm border px-3 text-sm transition-colors md:flex">
            <Search className="size-4" />
            <span className="text-fathom">Cari alert, MMSI, zona...</span>
            <span className="font-data ml-auto text-[0.6875rem] text-fathom">CMD K</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="border-fog bg-trench hidden h-8 items-center gap-2 rounded-sm border px-2.5 md:flex">
              <span className="bg-signal live-pulse size-2 rounded-full" />
              <span className="font-data text-[0.6875rem] text-mist-t">LIVE</span>
            </div>

            <Button variant="outline" size="sm" className="hidden gap-1.5 md:inline-flex">
              Agency Saya
              <ChevronDown className="size-3.5" />
            </Button>

            <Button variant="ghost" size="icon-sm" aria-label="Buka asisten SIREN">
              <Sparkles className="text-signal-bright size-4" />
            </Button>

            <div className="border-fog ml-1 hidden h-8 items-center gap-2 border-l pl-3 sm:flex">
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
