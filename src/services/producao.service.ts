import "server-only"

import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { daysInMonth, monthRange } from "@/lib/period"

type LinhaPorTipo = { operadorId: number; tipoId: number; total: number | bigint | string }

function agruparPorOperador(linhas: LinhaPorTipo[]): Map<number, Record<number, number>> {
  const mapa = new Map<number, Record<number, number>>()
  for (const linha of linhas) {
    const atual = mapa.get(linha.operadorId) ?? {}
    atual[linha.tipoId] = Number(linha.total)
    mapa.set(linha.operadorId, atual)
  }
  return mapa
}

function somarValores(registro: Record<number, number>): number {
  return Object.values(registro).reduce((acc, v) => acc + v, 0)
}

export type TotalOperador = {
  operadorId: number
  nome: string
  qtdDigitadas: number
  qtdContas: number
  totalSeguros: number
  /** quantidade lançada por tipoSeguroId, apenas para seguros com lançamento no período */
  seguros: Record<number, number>
  totalSocios: number
  /** quantidade lançada por tipoSocioId, apenas para sócios com lançamento no período */
  socios: Record<number, number>
}

/**
 * Totais mensais por operador ativo, usados por ranking, dashboards e
 * comparativos. Executa queries agregadas no banco (nunca N+1): lista de
 * operadores, groupBy de lançamentos diários e um SUM agrupado por
 * seguro/sócio via SQL raw (necessário porque as tabelas de seguro/sócio
 * não guardam a data diretamente, só via o lançamento pai).
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
    _sum: { qtdDigitadas: true, qtdContas: true },
  })

  const totaisSeguros = await prisma.$queryRaw<LinhaPorTipo[]>(Prisma.sql`
    SELECT ld.operador_id AS operadorId, lsd.tipo_seguro_id AS tipoId,
           CAST(SUM(lsd.quantidade) AS UNSIGNED) AS total
    FROM lancamentos_seguros_diarios lsd
    INNER JOIN lancamentos_diarios ld ON ld.id = lsd.lancamento_diario_id
    WHERE ld.data >= ${inicio} AND ld.data < ${fim}
    GROUP BY ld.operador_id, lsd.tipo_seguro_id
  `)

  const totaisSocios = await prisma.$queryRaw<LinhaPorTipo[]>(Prisma.sql`
    SELECT ld.operador_id AS operadorId, lsd.tipo_socio_id AS tipoId,
           CAST(SUM(lsd.quantidade) AS UNSIGNED) AS total
    FROM lancamentos_socios_diarios lsd
    INNER JOIN lancamentos_diarios ld ON ld.id = lsd.lancamento_diario_id
    WHERE ld.data >= ${inicio} AND ld.data < ${fim}
    GROUP BY ld.operador_id, lsd.tipo_socio_id
  `)

  const diariosPorOperador = new Map(totaisDiarios.map((t) => [t.operadorId, t._sum]))
  const segurosPorOperador = agruparPorOperador(totaisSeguros)
  const sociosPorOperador = agruparPorOperador(totaisSocios)

  return operadores.map((op) => {
    const diario = diariosPorOperador.get(op.id)
    const seguros = segurosPorOperador.get(op.id) ?? {}
    const socios = sociosPorOperador.get(op.id) ?? {}
    return {
      operadorId: op.id,
      nome: op.nome,
      qtdDigitadas: diario?.qtdDigitadas ?? 0,
      qtdContas: diario?.qtdContas ?? 0,
      totalSeguros: somarValores(seguros),
      seguros,
      totalSocios: somarValores(socios),
      socios,
    }
  })
}

export type EvolucaoDia = {
  dia: number
  qtdDigitadas: number
  qtdContas: number
  totalSeguros: number
  totalSocios: number
  acumuladoDigitadas: number
  acumuladoContas: number
  acumuladoSeguros: number
  acumuladoSocios: number
}

type ValoresDia = { qtdDigitadas: number; qtdContas: number; totalSeguros: number; totalSocios: number }

/** Preenche os dias sem lançamento com zero e calcula o acumulado dia a dia. */
function construirEvolucao(porDia: Map<number, ValoresDia>, mes: number, ano: number): EvolucaoDia[] {
  const totalDias = daysInMonth(mes, ano)
  const resultado: EvolucaoDia[] = []
  let acumuladoDigitadas = 0
  let acumuladoContas = 0
  let acumuladoSeguros = 0
  let acumuladoSocios = 0

  for (let dia = 1; dia <= totalDias; dia++) {
    const valores = porDia.get(dia) ?? { qtdDigitadas: 0, qtdContas: 0, totalSeguros: 0, totalSocios: 0 }
    acumuladoDigitadas += valores.qtdDigitadas
    acumuladoContas += valores.qtdContas
    acumuladoSeguros += valores.totalSeguros
    acumuladoSocios += valores.totalSocios
    resultado.push({
      dia,
      ...valores,
      acumuladoDigitadas,
      acumuladoContas,
      acumuladoSeguros,
      acumuladoSocios,
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
    include: { seguros: true, socios: true },
    orderBy: { data: "asc" },
  })

  const porDia = new Map<number, ValoresDia>()
  for (const lancamento of lancamentos) {
    const dia = lancamento.data.getUTCDate()
    porDia.set(dia, {
      qtdDigitadas: lancamento.qtdDigitadas,
      qtdContas: lancamento.qtdContas,
      totalSeguros: lancamento.seguros.reduce((acc, s) => acc + s.quantidade, 0),
      totalSocios: lancamento.socios.reduce((acc, s) => acc + s.quantidade, 0),
    })
  }

  return construirEvolucao(porDia, mes, ano)
}

/** Série diária agregada de toda a equipe ativa em um mês, para o relatório executivo. */
export async function getEvolucaoEquipe(mes: number, ano: number): Promise<EvolucaoDia[]> {
  const { inicio, fim } = monthRange(mes, ano)

  const lancamentos = await prisma.lancamentoDiario.findMany({
    where: { data: { gte: inicio, lt: fim }, operador: { ativo: true } },
    include: { seguros: true, socios: true },
  })

  const porDia = new Map<number, ValoresDia>()
  for (const lancamento of lancamentos) {
    const dia = lancamento.data.getUTCDate()
    const atual = porDia.get(dia) ?? { qtdDigitadas: 0, qtdContas: 0, totalSeguros: 0, totalSocios: 0 }
    atual.qtdDigitadas += lancamento.qtdDigitadas
    atual.qtdContas += lancamento.qtdContas
    atual.totalSeguros += lancamento.seguros.reduce((acc, s) => acc + s.quantidade, 0)
    atual.totalSocios += lancamento.socios.reduce((acc, s) => acc + s.quantidade, 0)
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

export type ComposicaoSocio = { tipoSocioId: number; nome: string; total: number }

/** Total lançado por tipo de sócio no mês (equipe toda, ou de um operador específico). */
export async function getComposicaoSocios(
  mes: number,
  ano: number,
  operadorId?: number
): Promise<ComposicaoSocio[]> {
  const { inicio, fim } = monthRange(mes, ano)

  const rows = await prisma.$queryRaw<{ tipoSocioId: number; total: number | bigint | string }[]>(Prisma.sql`
    SELECT lsd.tipo_socio_id AS tipoSocioId, CAST(SUM(lsd.quantidade) AS UNSIGNED) AS total
    FROM lancamentos_socios_diarios lsd
    INNER JOIN lancamentos_diarios ld ON ld.id = lsd.lancamento_diario_id
    WHERE ld.data >= ${inicio} AND ld.data < ${fim}
    ${operadorId ? Prisma.sql`AND ld.operador_id = ${operadorId}` : Prisma.empty}
    GROUP BY lsd.tipo_socio_id
  `)

  const tipos = await prisma.tipoSocio.findMany({ select: { id: true, nome: true } })
  const nomePorId = new Map(tipos.map((t) => [t.id, t.nome]))

  return rows
    .map((row) => ({
      tipoSocioId: row.tipoSocioId,
      nome: nomePorId.get(row.tipoSocioId) ?? "Sócio removido",
      total: Number(row.total),
    }))
    .sort((a, b) => b.total - a.total)
}
