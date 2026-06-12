"use client"

import {
  Ban,
  BarChart3,
  Bell,
  Briefcase,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Ship,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

const operationalItems = [
  { href: "/dashboard", label: "Command", icon: LayoutDashboard },
  { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
  { href: "/dashboard/cases", label: "Cases", icon: Briefcase },
  { href: "/dashboard/vessels", label: "Vessels", icon: Ship },
  { href: "/dashboard/dark-vessels", label: "Dark Vessels", icon: Ban },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
]

const utilityItems = [
  { href: "/dashboard/audit", label: "Audit", icon: ShieldCheck, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-sm px-3 text-sm transition-colors",
        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        active &&
          "bg-signal/15 text-foam shadow-[inset_2px_0_0_var(--signal)]"
      )}
    >
      <Icon className={cn("size-4", active ? "text-signal-bright" : "text-fathom")} />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function DashboardNav({ role }: { role: string }) {
  const pathname = usePathname()

  return (
    <nav data-tour="nav" className="flex flex-1 flex-col gap-6 px-3 py-4">
      <div className="space-y-2">
        <div className="font-data px-3 text-[0.6875rem] uppercase text-fathom">
          Operasional
        </div>
        <div className="space-y-1">
          {operationalItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname.startsWith(item.href)
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-auto space-y-2">
        <div className="font-data px-3 text-[0.6875rem] uppercase text-fathom">
          Utilitas
        </div>
        <div className="space-y-1">
          {utilityItems
            .filter((item) => !item.adminOnly || role === "admin")
            .map((item) => (
              <NavItem
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
              />
            ))}
        </div>
      </div>
    </nav>
  )
}
