import { NextResponse, type NextRequest } from "next/server"

import { requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { getRanking, parseOrdenarPor } from "@/services/ranking.service"
import { periodoSchema } from "@/validations/periodo.schema"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { mes, ano } = periodoSchema.parse(Object.fromEntries(request.nextUrl.searchParams))
    const ordenarPor = parseOrdenarPor(request.nextUrl.searchParams.get("ordenarPor"))

    const ranking = await getRanking({ mes, ano, ordenarPor })
    return NextResponse.json(ranking)
  } catch (error) {
    return handleApiError(error)
  }
}
