import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { parseIdParam } from "@/lib/params"
import { updateTipoSeguro } from "@/services/seguro.service"
import { updateSeguroSchema } from "@/validations/seguro.schema"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const tipoSeguroId = parseIdParam(id)
    const body = await request.json()
    const input = updateSeguroSchema.parse(body)
    const tipoSeguro = await updateTipoSeguro(tipoSeguroId, input)
    return NextResponse.json(tipoSeguro)
  } catch (error) {
    return handleApiError(error)
  }
}
