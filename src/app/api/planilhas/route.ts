import { NextResponse, type NextRequest } from "next/server"

import { requireAdmin, requireAuth } from "@/lib/auth"
import { handleApiError } from "@/lib/api-error"
import { ServiceError } from "@/lib/errors"
import { importarPlanilha, listImportacoes } from "@/services/planilha.service"

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024 // 15MB

export async function GET() {
  try {
    await requireAuth()
    const importacoes = await listImportacoes()
    return NextResponse.json(importacoes)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()

    const formData = await request.formData()
    const file = formData.get("arquivo")
    if (!(file instanceof File)) {
      throw new ServiceError("Envie um arquivo no campo 'arquivo'.")
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new ServiceError("O arquivo precisa ser uma planilha .xlsx.")
    }
    if (file.size > TAMANHO_MAXIMO_BYTES) {
      throw new ServiceError("Arquivo maior que o limite permitido (15MB).")
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const importacao = await importarPlanilha({
      buffer,
      nomeArquivo: file.name,
      importadoPorId: session.operadorId,
    })

    return NextResponse.json(importacao, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
