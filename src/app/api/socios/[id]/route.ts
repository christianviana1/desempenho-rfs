import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { parseIdParam } from "@/lib/params"
import { updateTipoSocio } from "@/services/socio.service"
import { updateSocioSchema } from "@/validations/socio.schema"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const tipoSocioId = parseIdParam(id)
    const body = await request.json()
    const input = updateSocioSchema.parse(body)
    const tipoSocio = await updateTipoSocio(tipoSocioId, input)
    return NextResponse.json(tipoSocio)
  } catch (error) {
    return handleApiError(error)
  }
}
