import "server-only"

import type { TipoSeguro } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import type { CreateSeguroInput, UpdateSeguroInput } from "@/validations/seguro.schema"

export async function listTiposSeguro(params: { apenasAtivos?: boolean } = {}): Promise<TipoSeguro[]> {
  return prisma.tipoSeguro.findMany({
    where: params.apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: "asc" },
  })
}

export async function getTipoSeguroById(id: number): Promise<TipoSeguro> {
  const tipoSeguro = await prisma.tipoSeguro.findUnique({ where: { id } })
  if (!tipoSeguro) throw new NotFoundError("Tipo de seguro não encontrado.")
  return tipoSeguro
}

export async function createTipoSeguro(input: CreateSeguroInput): Promise<TipoSeguro> {
  return prisma.tipoSeguro.create({ data: input })
}

export async function updateTipoSeguro(id: number, input: UpdateSeguroInput): Promise<TipoSeguro> {
  await getTipoSeguroById(id)
  return prisma.tipoSeguro.update({ where: { id }, data: input })
}

/** Desativa um tipo de seguro: some das novas telas de lançamento/meta, mas o histórico permanece intacto. */
export async function setTipoSeguroAtivo(id: number, ativo: boolean): Promise<TipoSeguro> {
  await getTipoSeguroById(id)
  return prisma.tipoSeguro.update({ where: { id }, data: { ativo } })
}
