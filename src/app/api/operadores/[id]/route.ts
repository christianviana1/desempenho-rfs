import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { parseIdParam } from "@/lib/params"
import { updateOperador } from "@/services/operador.service"
import { updateOperadorSchema } from "@/validations/operador.schema"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const operadorId = parseIdParam(id)
    const body = await request.json()
    const input = updateOperadorSchema.parse(body)
    const operador = await updateOperador(operadorId, input)
    return NextResponse.json(operador)
  } catch (error) {
    return handleApiError(error)
  }
}
