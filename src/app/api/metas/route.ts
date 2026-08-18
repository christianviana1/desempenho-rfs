import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { getMetaMensal, upsertMetaMensal } from "@/services/meta.service"
import { upsertMetaMensalSchema } from "@/validations/meta.schema"
import { periodoSchema } from "@/validations/periodo.schema"

/** A meta é individual (mesmo alvo para todos os operadores ativos) — qualquer usuário autenticado pode consultá-la. */
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { mes, ano } = periodoSchema.parse(Object.fromEntries(request.nextUrl.searchParams))

    const meta = await getMetaMensal(mes, ano)
    return NextResponse.json(meta)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const input = upsertMetaMensalSchema.parse(body)
    const meta = await upsertMetaMensal(input)
    return NextResponse.json(meta, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
