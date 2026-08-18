import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { Perfil } from "@/lib/session"
import { createTipoSeguro, listTiposSeguro } from "@/services/seguro.service"
import { createSeguroSchema } from "@/validations/seguro.schema"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    // Operadores comuns só podem ver tipos de seguro ativos (para os formulários de lançamento).
    const apenasAtivos =
      session.perfil === Perfil.ADMIN
        ? request.nextUrl.searchParams.get("ativos") === "true"
        : true
    const tipos = await listTiposSeguro({ apenasAtivos })
    return NextResponse.json(tipos)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const input = createSeguroSchema.parse(body)
    const tipoSeguro = await createTipoSeguro(input)
    return NextResponse.json(tipoSeguro, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
