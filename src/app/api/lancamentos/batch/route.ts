import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { ServiceError } from "@/lib/errors"
import { getFechamentoDiario, upsertLancamentosBatch } from "@/services/lancamento.service"
import { dataSchema, lancamentoBatchSchema } from "@/validations/lancamento.schema"

/** Tela de fechamento diário em lote — restrita ao admin. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const dataParam = request.nextUrl.searchParams.get("data")
    if (!dataParam) throw new ServiceError("Informe a data.", 400)
    const data = dataSchema.parse(dataParam)

    const fechamento = await getFechamentoDiario(data)
    return NextResponse.json(fechamento)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const input = lancamentoBatchSchema.parse(body)
    const idsAtualizados = await upsertLancamentosBatch(input)
    return NextResponse.json({ ok: true, quantidade: idsAtualizados.length })
  } catch (error) {
    return handleApiError(error)
  }
}
