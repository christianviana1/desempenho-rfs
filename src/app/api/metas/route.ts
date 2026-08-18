import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { Perfil } from "@/lib/session"
import { getMetaMensal, listMetasMensais, upsertMetaMensal } from "@/services/meta.service"
import { metaFiltroSchema, upsertMetaMensalSchema } from "@/validations/meta.schema"

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { mes, ano, operadorId } = metaFiltroSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    )

    if (session.perfil !== Perfil.ADMIN) {
      const meta = await getMetaMensal(session.operadorId, mes, ano)
      return NextResponse.json(meta ? [meta] : [])
    }

    const metas = await listMetasMensais({ mes, ano, operadorId })
    return NextResponse.json(metas)
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
