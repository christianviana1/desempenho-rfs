import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/auth"
import { AppShell } from "@/components/shared/app-shell"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // O middleware já barra operadores em /admin; esta checagem é a segunda
  // camada de defesa exigida pela seção 7 do escopo (nunca confiar só no middleware).
  const session = await getSession()
  if (!session || session.perfil !== "ADMIN") {
    redirect("/")
  }

  return (
    <AppShell role="admin" userName={session.nome} userRoleLabel="Administrador">
      {children}
    </AppShell>
  )
}
