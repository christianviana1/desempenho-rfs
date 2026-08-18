import "server-only"

import { Prisma, type Operador } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { ConflictError, NotFoundError } from "@/lib/errors"
import type { CreateOperadorInput, UpdateOperadorInput } from "@/validations/operador.schema"

export async function listOperadores(params: { apenasAtivos?: boolean } = {}): Promise<Operador[]> {
  return prisma.operador.findMany({
    where: params.apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: "asc" },
  })
}

export async function getOperadorById(id: number): Promise<Operador> {
  const operador = await prisma.operador.findUnique({ where: { id } })
  if (!operador) throw new NotFoundError("Operador não encontrado.")
  return operador
}

export async function getOperadorByLogin(login: string): Promise<Operador | null> {
  return prisma.operador.findUnique({ where: { login } })
}

export async function createOperador(input: CreateOperadorInput): Promise<Operador> {
  try {
    return await prisma.operador.create({ data: input })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Já existe um operador com esse login.")
    }
    throw error
  }
}

export async function updateOperador(id: number, input: UpdateOperadorInput): Promise<Operador> {
  await getOperadorById(id)
  try {
    return await prisma.operador.update({ where: { id }, data: input })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Já existe um operador com esse login.")
    }
    throw error
  }
}

/** Ativa/desativa um operador. Nunca excluímos fisicamente: histórico de produção deve permanecer intacto. */
export async function setOperadorAtivo(id: number, ativo: boolean): Promise<Operador> {
  await getOperadorById(id)
  return prisma.operador.update({ where: { id }, data: { ativo } })
}
