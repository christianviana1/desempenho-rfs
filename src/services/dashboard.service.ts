import "server-only"

import { getMetaMensal } from "@/services/meta.service"
import { getRanking } from "@/services/ranking.service"
import {
  getComposicaoSeguros,
  getEvolucaoDiaria,
  getEvolucaoEquipe,
  getTotaisMensalPorOperador,
  type ComposicaoSeguro,
  type EvolucaoDia,
} from "@/services/producao.service"

export type CardResumo = {
  label: string
  realizado: number
  meta: number
  percentual: number
}

export type ResumoOperador = {
  digitadas: CardResumo
  contas: CardResumo
  socios: CardResumo
  seguros: CardResumo
  evolucao: EvolucaoDia[]
  composicaoSeguros: ComposicaoSeguro[]
}

function percentual(realizado: number, meta: number): number {
  if (meta <= 0) return 0
  return Math.round((realizado / meta) * 1000) / 10
}

/** Cards + gráficos do dashboard do operador (seção 15). */
export async function getResumoOperador(
  operadorId: number,
  mes: number,
  ano: number
): Promise<ResumoOperador> {
  const [evolucao, composicaoSeguros, meta] = await Promise.all([
    getEvolucaoDiaria(operadorId, mes, ano),
    getComposicaoSeguros(mes, ano, operadorId),
    getMetaMensal(operadorId, mes, ano),
  ])

  const ultimoDia = evolucao[evolucao.length - 1]
  const realizadoDigitadas = ultimoDia?.acumuladoDigitadas ?? 0
  const realizadoContas = ultimoDia?.acumuladoContas ?? 0
  const realizadoSocios = ultimoDia?.acumuladoSocios ?? 0
  const realizadoSeguros = ultimoDia?.acumuladoSeguros ?? 0

  const metaDigitadas = meta?.metaDigitadas ?? 0
  const metaContas = meta?.metaContas ?? 0
  const metaSocios = meta?.metaSocios ?? 0
  const metaSegurosTotal = meta?.metasSeguros.reduce((acc, s) => acc + s.quantidadeMeta, 0) ?? 0

  return {
    digitadas: {
      label: "Digitadas",
      realizado: realizadoDigitadas,
      meta: metaDigitadas,
      percentual: percentual(realizadoDigitadas, metaDigitadas),
    },
    contas: {
      label: "Contas",
      realizado: realizadoContas,
      meta: metaContas,
      percentual: percentual(realizadoContas, metaContas),
    },
    socios: {
      label: "Sócios",
      realizado: realizadoSocios,
      meta: metaSocios,
      percentual: percentual(realizadoSocios, metaSocios),
    },
    seguros: {
      label: "Seguros",
      realizado: realizadoSeguros,
      meta: metaSegurosTotal,
      percentual: percentual(realizadoSeguros, metaSegurosTotal),
    },
    evolucao,
    composicaoSeguros,
  }
}

export type RelatorioExecutivo = {
  totalEquipe: {
    qtdDigitadas: number
    qtdContas: number
    qtdSocios: number
    totalSeguros: number
  }
  metaEquipe: {
    metaDigitadas: number
    metaContas: number
    metaSocios: number
    metaSegurosTotal: number
  }
  percentualGeralMeta: number
  melhorOperador: { operadorId: number; nome: string; percentualMeta: number } | null
  melhorSeguro: ComposicaoSeguro | null
  ranking: Awaited<ReturnType<typeof getRanking>>
  evolucaoEquipe: EvolucaoDia[]
  composicaoSeguros: ComposicaoSeguro[]
}

/**
 * Visão executiva (seção 20). "Melhor operador" = 1º colocado no ranking
 * por percentual geral de atingimento de meta (mesma métrica documentada
 * em ranking.service.ts). "Melhor seguro" = tipo de seguro com maior
 * quantidade lançada pela equipe no mês.
 */
export async function getRelatorioExecutivo(mes: number, ano: number): Promise<RelatorioExecutivo> {
  const [totaisPorOperador, ranking, evolucaoEquipe, composicaoSeguros] = await Promise.all([
    getTotaisMensalPorOperador(mes, ano),
    getRanking({ mes, ano, ordenarPor: "percentualMeta" }),
    getEvolucaoEquipe(mes, ano),
    getComposicaoSeguros(mes, ano),
  ])

  const totalEquipe = totaisPorOperador.reduce(
    (acc, op) => ({
      qtdDigitadas: acc.qtdDigitadas + op.qtdDigitadas,
      qtdContas: acc.qtdContas + op.qtdContas,
      qtdSocios: acc.qtdSocios + op.qtdSocios,
      totalSeguros: acc.totalSeguros + op.totalSeguros,
    }),
    { qtdDigitadas: 0, qtdContas: 0, qtdSocios: 0, totalSeguros: 0 }
  )

  const metaEquipe = ranking.reduce(
    (acc, item) => ({
      metaDigitadas: acc.metaDigitadas + item.metaDigitadas,
      metaContas: acc.metaContas + item.metaContas,
      metaSocios: acc.metaSocios + item.metaSocios,
      metaSegurosTotal: acc.metaSegurosTotal + item.metaSegurosTotal,
    }),
    { metaDigitadas: 0, metaContas: 0, metaSocios: 0, metaSegurosTotal: 0 }
  )

  const realizadoTotal =
    totalEquipe.qtdDigitadas + totalEquipe.qtdContas + totalEquipe.qtdSocios + totalEquipe.totalSeguros
  const metaTotal =
    metaEquipe.metaDigitadas + metaEquipe.metaContas + metaEquipe.metaSocios + metaEquipe.metaSegurosTotal
  const percentualGeralMeta = metaTotal > 0 ? Math.round((realizadoTotal / metaTotal) * 1000) / 10 : 0

  const melhorOperador = ranking[0]
    ? { operadorId: ranking[0].operadorId, nome: ranking[0].nome, percentualMeta: ranking[0].percentualMeta }
    : null

  const melhorSeguro = composicaoSeguros[0] ?? null

  return {
    totalEquipe,
    metaEquipe,
    percentualGeralMeta,
    melhorOperador,
    melhorSeguro,
    ranking,
    evolucaoEquipe,
    composicaoSeguros,
  }
}
