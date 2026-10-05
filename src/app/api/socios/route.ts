import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { Perfil } from "@/lib/session"
import { createTipoSocio, listTiposSocio } from "@/services/socio.service"
import { createSocioSchema } from "@/validations/socio.schema"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    // Operadores comuns só podem ver tipos de sócio ativos (para os formulários de lançamento).
    const apenasAtivos =
      session.perfil === Perfil.ADMIN
        ? request.nextUrl.searchParams.get("ativos") === "true"
        : true
    const tipos = await listTiposSocio({ apenasAtivos })
    return NextResponse.json(tipos)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const input = createSocioSchema.parse(body)
    const tipoSocio = await createTipoSocio(input)
    return NextResponse.json(tipoSocio, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
