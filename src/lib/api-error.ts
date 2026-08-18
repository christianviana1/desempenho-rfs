import { NextResponse } from "next/server"
import { ZodError } from "zod"

import { AuthError } from "@/lib/auth"
import { ServiceError } from "@/lib/errors"

/**
 * Ponto único de tradução de erros para respostas HTTP. Todos os Route
 * Handlers devem envolver sua lógica em try/catch e delegar aqui, evitando
 * duplicar mapeamento de erro -> status code em cada endpoint.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos.", issues: error.issues },
      { status: 422 }
    )
  }

  if (error instanceof AuthError || error instanceof ServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }

  console.error(error)
  return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 })
}
