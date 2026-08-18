import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { ClipboardList, LayoutDashboard, Trophy } from "lucide-react"

import { getSession } from "@/lib/auth"
import { AppShell, type NavItem } from "@/components/shared/app-shell"

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Meu Painel", icon: LayoutDashboard },
  { href: "/dashboard/lancamento", label: "Lançar Produção", icon: ClipboardList },
  { href: "/dashboard/ranking", label: "Ranking", icon: Trophy },
]

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect("/")
  }

  return (
    <AppShell
      navItems={navItems}
      rootHref="/dashboard"
      userName={session.nome}
      userRoleLabel={session.perfil === "ADMIN" ? "Administrador" : "Operador"}
    >
      {children}
    </AppShell>
  )
}
