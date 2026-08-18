import "server-only"

import { prisma } from "@/lib/prisma"
import { ServiceError } from "@/lib/errors"
import type { SessionPayload } from "@/lib/session"

/**
 * Login passwordless: valida apenas existência + status ativo do login.
 * Mensagens de erro propositalmente não distinguem "login não existe" de
 * "login inativo" em detalhe além do necessário para o usuário corrigir,
 * evitando enumeração desnecessária de contas válidas.
 */
export async function authenticateByLogin(login: string): Promise<SessionPayload> {
  const operador = await prisma.operador.findUnique({ where: { login } })

  if (!operador) {
    throw new ServiceError("Login não encontrado.", 401)
  }

  if (!operador.ativo) {
    throw new ServiceError("Este operador está inativo. Contate o administrador.", 403)
  }

  return {
    operadorId: operador.id,
    perfil: operador.perfil,
    nome: operador.nome,
    login: operador.login,
  }
}
