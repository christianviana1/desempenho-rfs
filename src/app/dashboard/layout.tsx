import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth"
import { AppShell } from "@/components/shared/app-shell"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect("/")
  }

  return (
    <AppShell
      role="dashboard"
      userName={session.nome}
      userRoleLabel={session.perfil === "ADMIN" ? "Administrador" : "Operador"}
    >
      {children}
    </AppShell>
  )
}
