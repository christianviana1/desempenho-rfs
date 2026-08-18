import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { createOperador, listOperadores } from "@/services/operador.service"
import { createOperadorSchema } from "@/validations/operador.schema"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const apenasAtivos = request.nextUrl.searchParams.get("ativos") === "true"
    const operadores = await listOperadores({ apenasAtivos })
    return NextResponse.json(operadores)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const input = createOperadorSchema.parse(body)
    const operador = await createOperador(input)
    return NextResponse.json(operador, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
