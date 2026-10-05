import { NextResponse } from "next/server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { parseIdParam } from "@/lib/params"
import { deleteImportacao, getImportacaoComLinhas } from "@/services/planilha.service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const importacao = await getImportacaoComLinhas(parseIdParam(id))
    return NextResponse.json(importacao)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    await deleteImportacao(parseIdParam(id))
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error)
  }
}
