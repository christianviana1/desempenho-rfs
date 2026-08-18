import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { BarChart3, ClipboardList, LayoutDashboard, ShieldCheck, Target, Trophy, Users } from "lucide-react"

import { getSession } from "@/lib/auth"
import { AppShell, type NavItem } from "@/components/shared/app-shell"

const navItems: NavItem[] = [
  { href: "/admin", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/admin/operadores", label: "Operadores", icon: Users },
  { href: "/admin/seguros", label: "Tipos de Seguro", icon: ShieldCheck },
  { href: "/admin/metas", label: "Metas Mensais", icon: Target },
  { href: "/admin/fechamento", label: "Fechamento Diário", icon: ClipboardList },
  { href: "/admin/ranking", label: "Ranking", icon: Trophy },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // O middleware já barra operadores em /admin; esta checagem é a segunda
  // camada de defesa exigida pela seção 7 do escopo (nunca confiar só no middleware).
  const session = await getSession()
  if (!session || session.perfil !== "ADMIN") {
    redirect("/")
  }

  return (
    <AppShell navItems={navItems} rootHref="/admin" userName={session.nome} userRoleLabel="Administrador">
      {children}
    </AppShell>
  )
}
