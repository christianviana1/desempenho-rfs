"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LineChart, Menu } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LogoutButton } from "@/components/shared/logout-button"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

function isActiveHref(pathname: string, href: string, rootHrefs: string[]): boolean {
  if (pathname === href) return true
  if (rootHrefs.includes(href)) return false
  return pathname.startsWith(`${href}/`)
}

function NavLinks({
  items,
  rootHrefs,
  onNavigate,
}: {
  items: NavItem[]
  rootHrefs: string[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="grid gap-1 px-2">
      {items.map((item) => {
        const active = isActiveHref(pathname, item.href, rootHrefs)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AppShell({
  navItems,
  rootHref,
  userName,
  userRoleLabel,
  children,
}: {
  navItems: NavItem[]
  /** href da página inicial da seção (ex: "/admin"), usado para não marcar como ativo em sub-rotas. */
  rootHref: string
  userName: string
  userRoleLabel: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const currentLabel = navItems.find((item) => isActiveHref(pathname, item.href, [rootHref]))?.label

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-64 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <LineChart className="size-5" />
          <span className="font-semibold">Desempenho RFS</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <NavLinks items={navItems} rootHrefs={[rootHref]} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 p-0">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <div className="flex h-14 items-center gap-2 border-b px-4">
                <LineChart className="size-5" />
                <span className="font-semibold">Desempenho RFS</span>
              </div>
              <div className="py-4">
                <NavLinks
                  items={navItems}
                  rootHrefs={[rootHref]}
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {currentLabel ?? "Desempenho RFS"}
          </p>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{userName}</p>
              <p className="text-xs leading-tight text-muted-foreground">{userRoleLabel}</p>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
