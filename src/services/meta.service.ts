import "server-only"

import { prisma } from "@/lib/prisma"
import type { UpsertMetaMensalInput } from "@/validations/meta.schema"

/** A meta mensal é única por período — o mesmo alvo individual vale para todos os operadores ativos. */
export async function getMetaMensal(mes: number, ano: number) {
  return prisma.metaMensal.findUnique({
    where: { mes_ano: { mes, ano } },
    include: {
      metasSeguros: { include: { tipoSeguro: true } },
      metasSocios: { include: { tipoSocio: true } },
    },
  })
}

/**
 * Cria ou atualiza a meta mensal do período e substitui integralmente suas
 * metas por seguro e por sócio (delete + recreate), tudo em uma única
 * transação. Metas para tipos de seguro/sócio inativos são silenciosamente
 * ignoradas.
 */
export async function upsertMetaMensal(input: UpsertMetaMensalInput) {
  const [tiposSeguroAtivos, tiposSocioAtivos] = await Promise.all([
    prisma.tipoSeguro.findMany({ where: { ativo: true }, select: { id: true } }),
    prisma.tipoSocio.findMany({ where: { ativo: true }, select: { id: true } }),
  ])
  const idsSeguroAtivos = new Set(tiposSeguroAtivos.map((t) => t.id))
  const idsSocioAtivos = new Set(tiposSocioAtivos.map((t) => t.id))
  const segurosValidos = input.seguros.filter((s) => idsSeguroAtivos.has(s.tipoSeguroId))
  const sociosValidos = input.socios.filter((s) => idsSocioAtivos.has(s.tipoSocioId))

  return prisma.$transaction(async (tx) => {
    const meta = await tx.metaMensal.upsert({
      where: { mes_ano: { mes: input.mes, ano: input.ano } },
      create: {
        mes: input.mes,
        ano: input.ano,
        metaDigitadas: input.metaDigitadas,
        metaContas: input.metaContas,
      },
      update: {
        metaDigitadas: input.metaDigitadas,
        metaContas: input.metaContas,
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

    await tx.metaSocioMensal.deleteMany({ where: { metaMensalId: meta.id } })
    if (sociosValidos.length > 0) {
      await tx.metaSocioMensal.createMany({
        data: sociosValidos.map((s) => ({
          metaMensalId: meta.id,
          tipoSocioId: s.tipoSocioId,
          quantidadeMeta: s.quantidadeMeta,
        })),
      })
    }

    return tx.metaMensal.findUniqueOrThrow({
      where: { id: meta.id },
      include: {
        metasSeguros: { include: { tipoSeguro: true } },
        metasSocios: { include: { tipoSocio: true } },
      },
    })
  })
}
