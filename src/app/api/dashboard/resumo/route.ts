import { NextResponse, type NextRequest } from "next/server"

import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { getResumoOperador } from "@/services/dashboard.service"
import { periodoSchema } from "@/validations/periodo.schema"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { mes, ano } = periodoSchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    const resumo = await getResumoOperador(session.operadorId, mes, ano)
    return NextResponse.json(resumo)
  } catch (error) {
    return handleApiError(error)
  }
}
