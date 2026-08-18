import { NextResponse, type NextRequest } from "next/server"

import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { ServiceError } from "@/lib/errors"
import { getLancamentoDiario, upsertLancamentoDiario } from "@/services/lancamento.service"
import { dataSchema, upsertLancamentoDiarioSchema } from "@/validations/lancamento.schema"

/**
 * Lançamento diário do PRÓPRIO operador autenticado. O operador_id nunca
 * vem do corpo da requisição — é sempre lido da sessão, impedindo que um
 * operador altere a produção de outro através de uma requisição manipulada.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const dataParam = request.nextUrl.searchParams.get("data")
    if (!dataParam) throw new ServiceError("Informe a data.", 400)
    const data = dataSchema.parse(dataParam)

    const lancamento = await getLancamentoDiario(session.operadorId, data)
    return NextResponse.json(lancamento)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json()
    const input = upsertLancamentoDiarioSchema.parse(body)
    const lancamento = await upsertLancamentoDiario(session.operadorId, input)
    return NextResponse.json(lancamento, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
