import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { getRelatorioExecutivo } from "@/services/dashboard.service"
import { periodoSchema } from "@/validations/periodo.schema"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { mes, ano } = periodoSchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    const relatorio = await getRelatorioExecutivo(mes, ano)
    return NextResponse.json(relatorio)
  } catch (error) {
    return handleApiError(error)
  }
}
