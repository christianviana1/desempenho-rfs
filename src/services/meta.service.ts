import "server-only"

import { prisma } from "@/lib/prisma"
import type { UpsertMetaMensalInput } from "@/validations/meta.schema"

/** A meta mensal é única por período — o mesmo alvo individual vale para todos os operadores ativos. */
export async function getMetaMensal(mes: number, ano: number) {
  return prisma.metaMensal.findUnique({
    where: { mes_ano: { mes, ano } },
    include: { metasSeguros: { include: { tipoSeguro: true } } },
  })
}

/**
 * Cria ou atualiza a meta mensal do período e substitui integralmente suas
 * metas por seguro (delete + recreate), tudo em uma única transação. Metas
 * para tipos de seguro inativos são silenciosamente ignoradas.
 */
export async function upsertMetaMensal(input: UpsertMetaMensalInput) {
  const tiposAtivos = await prisma.tipoSeguro.findMany({
    where: { ativo: true },
    select: { id: true },
  })
  const idsAtivos = new Set(tiposAtivos.map((t) => t.id))
  const segurosValidos = input.seguros.filter((s) => idsAtivos.has(s.tipoSeguroId))

  return prisma.$transaction(async (tx) => {
    const meta = await tx.metaMensal.upsert({
      where: { mes_ano: { mes: input.mes, ano: input.ano } },
      create: {
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
