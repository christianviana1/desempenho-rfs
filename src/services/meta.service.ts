import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError } from "@/lib/errors"
import type { UpsertMetaMensalInput } from "@/validations/meta.schema"

export async function getMetaMensal(operadorId: number, mes: number, ano: number) {
  return prisma.metaMensal.findUnique({
    where: { operadorId_mes_ano: { operadorId, mes, ano } },
    include: { metasSeguros: { include: { tipoSeguro: true } } },
  })
}

export async function listMetasMensais(params: { mes: number; ano: number; operadorId?: number }) {
  return prisma.metaMensal.findMany({
    where: { mes: params.mes, ano: params.ano, operadorId: params.operadorId },
    include: {
      operador: { select: { id: true, nome: true, ativo: true } },
      metasSeguros: { include: { tipoSeguro: { select: { id: true, nome: true } } } },
    },
    orderBy: { operador: { nome: "asc" } },
  })
}

/**
 * Cria ou atualiza a meta mensal de um operador e substitui integralmente
 * suas metas por seguro (delete + recreate), tudo em uma única transação.
 * Metas para tipos de seguro inativos são silenciosamente ignoradas.
 */
export async function upsertMetaMensal(input: UpsertMetaMensalInput) {
  const operador = await prisma.operador.findUnique({ where: { id: input.operadorId } })
  if (!operador) throw new NotFoundError("Operador não encontrado.")

  const tiposAtivos = await prisma.tipoSeguro.findMany({
    where: { ativo: true },
    select: { id: true },
  })
  const idsAtivos = new Set(tiposAtivos.map((t) => t.id))
  const segurosValidos = input.seguros.filter((s) => idsAtivos.has(s.tipoSeguroId))

  return prisma.$transaction(async (tx) => {
    const meta = await tx.metaMensal.upsert({
      where: {
        operadorId_mes_ano: { operadorId: input.operadorId, mes: input.mes, ano: input.ano },
      },
      create: {
        operadorId: input.operadorId,
        mes: input.mes,
        ano: input.ano,
        metaDigitadas: input.metaDigitadas,
        metaContas: input.metaContas,
        metaSocios: input.metaSocios,
      },
      update: {
        metaDigitadas: input.metaDigitadas,
        metaContas: input.metaContas,
        metaSocios: input.metaSocios,
      },
    })

    await tx.metaSeguroMensal.deleteMany({ where: { metaMensalId: meta.id } })
    if (segurosValidos.length > 0) {
      await tx.metaSeguroMensal.createMany({
        data: segurosValidos.map((s) => ({
          metaMensalId: meta.id,
          tipoSeguroId: s.tipoSeguroId,
          quantidadeMeta: s.quantidadeMeta,
        })),
      })
    }

    return tx.metaMensal.findUniqueOrThrow({
      where: { id: meta.id },
      include: { metasSeguros: { include: { tipoSeguro: true } } },
    })
  })
}
