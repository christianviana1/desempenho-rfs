import "server-only"

import type { TipoSocio } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import type { CreateSocioInput, UpdateSocioInput } from "@/validations/socio.schema"

export async function listTiposSocio(params: { apenasAtivos?: boolean } = {}): Promise<TipoSocio[]> {
  return prisma.tipoSocio.findMany({
    where: params.apenasAtivos ? { ativo: true } : undefined,
    orderBy: { nome: "asc" },
  })
}

export async function getTipoSocioById(id: number): Promise<TipoSocio> {
  const tipoSocio = await prisma.tipoSocio.findUnique({ where: { id } })
  if (!tipoSocio) throw new NotFoundError("Tipo de sócio não encontrado.")
  return tipoSocio
}

export async function createTipoSocio(input: CreateSocioInput): Promise<TipoSocio> {
  return prisma.tipoSocio.create({ data: input })
}

export async function updateTipoSocio(id: number, input: UpdateSocioInput): Promise<TipoSocio> {
  await getTipoSocioById(id)
  return prisma.tipoSocio.update({ where: { id }, data: input })
}

/** Desativa um tipo de sócio: some das novas telas de lançamento/meta, mas o histórico permanece intacto. */
export async function setTipoSocioAtivo(id: number, ativo: boolean): Promise<TipoSocio> {
  await getTipoSocioById(id)
  return prisma.tipoSocio.update({ where: { id }, data: { ativo } })
}
