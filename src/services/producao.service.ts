import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { daysInMonth, monthRange } from "@/lib/period"

export type TotalOperador = {
  operadorId: number
  nome: string
  qtdDigitadas: number
  qtdContas: number
  qtdSocios: number
  totalSeguros: number
  /** quantidade lançada por tipoSeguroId, apenas para seguros com lançamento no período */
  seguros: Record<number, number>
}

/**
 * Totais mensais por operador ativo, usados por ranking, dashboards e
 * comparativos. Executa 3 queries agregadas no banco (nunca N+1): lista de
 * operadores, groupBy de lançamentos diários e um SUM agrupado por seguro
 * via SQL raw (necessário porque lancamentos_seguros_diarios não guarda a
 * data diretamente, só via o lançamento pai).
 */
export async function getTotaisMensalPorOperador(mes: number, ano: number): Promise<TotalOperador[]> {
  const { inicio, fim } = monthRange(mes, ano)

  const operadores = await prisma.operador.findMany({
    where: { ativo: true },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  })

  const totaisDiarios = await prisma.lancamentoDiario.groupBy({
    by: ["operadorId"],
    where: { data: { gte: inicio, lt: fim } },
    _sum: { qtdDigitadas: true, qtdContas: true, qtdSocios: true },
  })

  const totaisSeguros = await prisma.$queryRaw<
    { operadorId: number; tipoSeguroId: number; total: number | bigint | string }[]
  >(Prisma.sql`
    SELECT ld.operador_id AS operadorId, lsd.tipo_seguro_id AS tipoSeguroId,
           CAST(SUM(lsd.quantidade) AS UNSIGNED) AS total
    FROM lancamentos_seguros_diarios lsd
    INNER JOIN lancamentos_diarios ld ON ld.id = lsd.lancamento_diario_id
    WHERE ld.data >= ${inicio} AND ld.data < ${fim}
    GROUP BY ld.operador_id, lsd.tipo_seguro_id
  `)

  const diariosPorOperador = new Map(totaisDiarios.map((t) => [t.operadorId, t._sum]))
  const segurosPorOperador = new Map<number, Record<number, number>>()
  for (const row of totaisSeguros) {
    const atual = segurosPorOperador.get(row.operadorId) ?? {}
    atual[row.tipoSeguroId] = Number(row.total)
    segurosPorOperador.set(row.operadorId, atual)
  }

  return operadores.map((op) => {
    const diario = diariosPorOperador.get(op.id)
    const seguros = segurosPorOperador.get(op.id) ?? {}
    const totalSeguros = Object.values(seguros).reduce((acc, v) => acc + v, 0)
    return {
      operadorId: op.id,
      nome: op.nome,
      qtdDigitadas: diario?.qtdDigitadas ?? 0,
      qtdContas: diario?.qtdContas ?? 0,
      qtdSocios: diario?.qtdSocios ?? 0,
      totalSeguros,
      seguros,
    }
  })
}

export type EvolucaoDia = {
  dia: number
  qtdDigitadas: number
  qtdContas: number
  qtdSocios: number
  totalSeguros: number
  acumuladoDigitadas: number
  acumuladoContas: number
  acumuladoSocios: number
  acumuladoSeguros: number
}

type ValoresDia = { qtdDigitadas: number; qtdContas: number; qtdSocios: number; totalSeguros: number }

/** Preenche os dias sem lançamento com zero e calcula o acumulado dia a dia. */
function construirEvolucao(porDia: Map<number, ValoresDia>, mes: number, ano: number): EvolucaoDia[] {
  const totalDias = daysInMonth(mes, ano)
  const resultado: EvolucaoDia[] = []
  let acumuladoDigitadas = 0
  let acumuladoContas = 0
  let acumuladoSocios = 0
  let acumuladoSeguros = 0

  for (let dia = 1; dia <= totalDias; dia++) {
    const valores = porDia.get(dia) ?? { qtdDigitadas: 0, qtdContas: 0, qtdSocios: 0, totalSeguros: 0 }
    acumuladoDigitadas += valores.qtdDigitadas
    acumuladoContas += valores.qtdContas
    acumuladoSocios += valores.qtdSocios
    acumuladoSeguros += valores.totalSeguros
    resultado.push({
      dia,
      ...valores,
      acumuladoDigitadas,
      acumuladoContas,
      acumuladoSocios,
      acumuladoSeguros,
    })
  }

  return resultado
}

/** Série diária (com acumulado) de um operador em um mês, para o gráfico de evolução. */
export async function getEvolucaoDiaria(
  operadorId: number,
  mes: number,
  ano: number
): Promise<EvolucaoDia[]> {
  const { inicio, fim } = monthRange(mes, ano)

  const lancamentos = await prisma.lancamentoDiario.findMany({
    where: { operadorId, data: { gte: inicio, lt: fim } },
    include: { seguros: true },
    orderBy: { data: "asc" },
  })

  const porDia = new Map<number, ValoresDia>()
  for (const lancamento of lancamentos) {
    const dia = lancamento.data.getUTCDate()
    const totalSeguros = lancamento.seguros.reduce((acc, s) => acc + s.quantidade, 0)
    porDia.set(dia, {
      qtdDigitadas: lancamento.qtdDigitadas,
      qtdContas: lancamento.qtdContas,
      qtdSocios: lancamento.qtdSocios,
      totalSeguros,
    })
  }

  return construirEvolucao(porDia, mes, ano)
}

/** Série diária agregada de toda a equipe ativa em um mês, para o relatório executivo. */
export async function getEvolucaoEquipe(mes: number, ano: number): Promise<EvolucaoDia[]> {
  const { inicio, fim } = monthRange(mes, ano)

  const lancamentos = await prisma.lancamentoDiario.findMany({
    where: { data: { gte: inicio, lt: fim }, operador: { ativo: true } },
    include: { seguros: true },
  })

  const porDia = new Map<number, ValoresDia>()
  for (const lancamento of lancamentos) {
    const dia = lancamento.data.getUTCDate()
    const atual = porDia.get(dia) ?? { qtdDigitadas: 0, qtdContas: 0, qtdSocios: 0, totalSeguros: 0 }
    atual.qtdDigitadas += lancamento.qtdDigitadas
    atual.qtdContas += lancamento.qtdContas
    atual.qtdSocios += lancamento.qtdSocios
    atual.totalSeguros += lancamento.seguros.reduce((acc, s) => acc + s.quantidade, 0)
    porDia.set(dia, atual)
  }

  return construirEvolucao(porDia, mes, ano)
}

export type ComposicaoSeguro = { tipoSeguroId: number; nome: string; total: number }

/** Total lançado por tipo de seguro no mês (equipe toda, ou de um operador específico). */
export async function getComposicaoSeguros(
  mes: number,
  ano: number,
  operadorId?: number
): Promise<ComposicaoSeguro[]> {
  const { inicio, fim } = monthRange(mes, ano)

  const rows = await prisma.$queryRaw<{ tipoSeguroId: number; total: number | bigint | string }[]>(Prisma.sql`
    SELECT lsd.tipo_seguro_id AS tipoSeguroId, CAST(SUM(lsd.quantidade) AS UNSIGNED) AS total
    FROM lancamentos_seguros_diarios lsd
    INNER JOIN lancamentos_diarios ld ON ld.id = lsd.lancamento_diario_id
    WHERE ld.data >= ${inicio} AND ld.data < ${fim}
    ${operadorId ? Prisma.sql`AND ld.operador_id = ${operadorId}` : Prisma.empty}
    GROUP BY lsd.tipo_seguro_id
  `)

  const tipos = await prisma.tipoSeguro.findMany({ select: { id: true, nome: true } })
  const nomePorId = new Map(tipos.map((t) => [t.id, t.nome]))

  return rows
    .map((row) => ({
      tipoSeguroId: row.tipoSeguroId,
      nome: nomePorId.get(row.tipoSeguroId) ?? "Seguro removido",
      total: Number(row.total),
    }))
    .sort((a, b) => b.total - a.total)
}
