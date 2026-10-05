import "server-only"

import { prisma } from "@/lib/prisma"
import { NotFoundError, ServiceError } from "@/lib/errors"
import type {
  LancamentoBatchInput,
  UpsertLancamentoDiarioInput,
} from "@/validations/lancamento.schema"

export async function getLancamentoDiario(operadorId: number, data: Date) {
  return prisma.lancamentoDiario.findUnique({
    where: { operadorId_data: { operadorId, data } },
    include: {
      seguros: { include: { tipoSeguro: { select: { id: true, nome: true } } } },
      socios: { include: { tipoSocio: { select: { id: true, nome: true } } } },
    },
  })
}

/**
 * Cria ou atualiza o lançamento diário de UM operador (usado tanto pelo
 * lançamento individual do operador quanto, item a item, pelo fechamento em
 * lote do admin). Substitui integralmente os lançamentos por seguro e por
 * sócio em uma transação — nunca aceita quantidade negativa (garantido pelo
 * schema Zod) e ignora tipos de seguro/sócio que não estejam mais ativos.
 */
export async function upsertLancamentoDiario(operadorId: number, input: UpsertLancamentoDiarioInput) {
  const [tiposSeguroAtivos, tiposSocioAtivos] = await Promise.all([
    prisma.tipoSeguro.findMany({ where: { ativo: true }, select: { id: true } }),
    prisma.tipoSocio.findMany({ where: { ativo: true }, select: { id: true } }),
  ])
  const idsSeguroAtivos = new Set(tiposSeguroAtivos.map((t) => t.id))
  const idsSocioAtivos = new Set(tiposSocioAtivos.map((t) => t.id))
  const segurosValidos = input.seguros.filter((s) => idsSeguroAtivos.has(s.tipoSeguroId))
  const sociosValidos = input.socios.filter((s) => idsSocioAtivos.has(s.tipoSocioId))

  return prisma.$transaction(async (tx) => {
    const lancamento = await tx.lancamentoDiario.upsert({
      where: { operadorId_data: { operadorId, data: input.data } },
      create: {
        operadorId,
        data: input.data,
        qtdDigitadas: input.qtdDigitadas,
        qtdContas: input.qtdContas,
      },
      update: {
        qtdDigitadas: input.qtdDigitadas,
        qtdContas: input.qtdContas,
      },
    })

    await tx.lancamentoSeguroDiario.deleteMany({ where: { lancamentoDiarioId: lancamento.id } })
    if (segurosValidos.length > 0) {
      await tx.lancamentoSeguroDiario.createMany({
        data: segurosValidos.map((s) => ({
          lancamentoDiarioId: lancamento.id,
          tipoSeguroId: s.tipoSeguroId,
          quantidade: s.quantidade,
        })),
      })
    }

    await tx.lancamentoSocioDiario.deleteMany({ where: { lancamentoDiarioId: lancamento.id } })
    if (sociosValidos.length > 0) {
      await tx.lancamentoSocioDiario.createMany({
        data: sociosValidos.map((s) => ({
          lancamentoDiarioId: lancamento.id,
          tipoSocioId: s.tipoSocioId,
          quantidade: s.quantidade,
        })),
      })
    }

    return tx.lancamentoDiario.findUniqueOrThrow({
      where: { id: lancamento.id },
      include: { seguros: true, socios: true },
    })
  })
}

export type FechamentoDiarioOperador = {
  operadorId: number
  nome: string
  qtdDigitadas: number
  qtdContas: number
  seguros: Record<number, number>
  socios: Record<number, number>
}

export type FechamentoDiario = {
  data: string
  tiposSeguro: { id: number; nome: string }[]
  tiposSocio: { id: number; nome: string }[]
  operadores: FechamentoDiarioOperador[]
}

/** Dados para a tela de fechamento em lote: todos os operadores ativos + o que já foi lançado na data. */
export async function getFechamentoDiario(data: Date): Promise<FechamentoDiario> {
  const [operadores, tiposSeguro, tiposSocio] = await Promise.all([
    prisma.operador.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        lancamentosDiarios: {
          where: { data },
          include: { seguros: true, socios: true },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.tipoSeguro.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.tipoSocio.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
  ])

  return {
    data: data.toISOString().slice(0, 10),
    tiposSeguro: tiposSeguro.map((t) => ({ id: t.id, nome: t.nome })),
    tiposSocio: tiposSocio.map((t) => ({ id: t.id, nome: t.nome })),
    operadores: operadores.map((op) => {
      const lancamento = op.lancamentosDiarios[0]
      const seguros: Record<number, number> = {}
      for (const s of lancamento?.seguros ?? []) {
        seguros[s.tipoSeguroId] = s.quantidade
      }
      const socios: Record<number, number> = {}
      for (const s of lancamento?.socios ?? []) {
        socios[s.tipoSocioId] = s.quantidade
      }
      return {
        operadorId: op.id,
        nome: op.nome,
        qtdDigitadas: lancamento?.qtdDigitadas ?? 0,
        qtdContas: lancamento?.qtdContas ?? 0,
        seguros,
        socios,
      }
    }),
  }
}

/**
 * Salva o fechamento diário de vários operadores em uma única transação:
 * se qualquer item falhar, nada é persistido (rollback automático do
 * Prisma). Apenas operadores ativos são aceitos, mesmo que o cliente envie
 * outros IDs.
 */
export async function upsertLancamentosBatch(input: LancamentoBatchInput): Promise<number[]> {
  const [operadoresAtivos, tiposSeguroAtivos, tiposSocioAtivos] = await Promise.all([
    prisma.operador.findMany({ where: { ativo: true }, select: { id: true } }),
    prisma.tipoSeguro.findMany({ where: { ativo: true }, select: { id: true } }),
    prisma.tipoSocio.findMany({ where: { ativo: true }, select: { id: true } }),
  ])
  const idsOperadoresAtivos = new Set(operadoresAtivos.map((o) => o.id))
  const idsSeguroAtivos = new Set(tiposSeguroAtivos.map((t) => t.id))
  const idsSocioAtivos = new Set(tiposSocioAtivos.map((t) => t.id))

  const itensValidos = input.lancamentos.filter((item) => idsOperadoresAtivos.has(item.operadorId))
  if (itensValidos.length === 0) {
    throw new ServiceError("Nenhum operador ativo informado no fechamento.", 422)
  }

  return prisma.$transaction(
    async (tx) => {
      const idsAtualizados: number[] = []

      for (const item of itensValidos) {
        const lancamento = await tx.lancamentoDiario.upsert({
          where: { operadorId_data: { operadorId: item.operadorId, data: input.data } },
          create: {
            operadorId: item.operadorId,
            data: input.data,
            qtdDigitadas: item.qtdDigitadas,
            qtdContas: item.qtdContas,
          },
          update: {
            qtdDigitadas: item.qtdDigitadas,
            qtdContas: item.qtdContas,
          },
        })

        await tx.lancamentoSeguroDiario.deleteMany({ where: { lancamentoDiarioId: lancamento.id } })
        const segurosValidos = item.seguros.filter((s) => idsSeguroAtivos.has(s.tipoSeguroId))
        if (segurosValidos.length > 0) {
          await tx.lancamentoSeguroDiario.createMany({
            data: segurosValidos.map((s) => ({
              lancamentoDiarioId: lancamento.id,
              tipoSeguroId: s.tipoSeguroId,
              quantidade: s.quantidade,
            })),
          })
        }

        await tx.lancamentoSocioDiario.deleteMany({ where: { lancamentoDiarioId: lancamento.id } })
        const sociosValidos = item.socios.filter((s) => idsSocioAtivos.has(s.tipoSocioId))
        if (sociosValidos.length > 0) {
          await tx.lancamentoSocioDiario.createMany({
            data: sociosValidos.map((s) => ({
              lancamentoDiarioId: lancamento.id,
              tipoSocioId: s.tipoSocioId,
              quantidade: s.quantidade,
            })),
          })
        }

        idsAtualizados.push(lancamento.id)
      }

      return idsAtualizados
    },
    { timeout: 20_000 }
  )
}

export async function assertLancamentoPertenceAoOperador(id: number, operadorId: number) {
  const lancamento = await prisma.lancamentoDiario.findUnique({ where: { id } })
  if (!lancamento) throw new NotFoundError("Lançamento não encontrado.")
  if (lancamento.operadorId !== operadorId) {
    throw new ServiceError("Você não pode alterar a produção de outro operador.", 403)
  }
  return lancamento
}
