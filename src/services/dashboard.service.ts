import "server-only"

import { getMetaMensal } from "@/services/meta.service"
import { getRanking } from "@/services/ranking.service"
import { listTiposSeguro } from "@/services/seguro.service"
import { listTiposSocio } from "@/services/socio.service"
import {
  getComposicaoSeguros,
  getComposicaoSocios,
  getEvolucaoDiaria,
  getEvolucaoEquipe,
  getTotaisMensalPorOperador,
  type ComposicaoSeguro,
  type ComposicaoSocio,
  type EvolucaoDia,
} from "@/services/producao.service"

export type CardResumo = {
  label: string
  realizado: number
  meta: number
  percentual: number
}

export type SeguroResumo = CardResumo & { tipoSeguroId: number }
export type SocioResumo = CardResumo & { tipoSocioId: number }

export type ResumoOperador = {
  digitadas: CardResumo
  contas: CardResumo
  /** Um item por tipo de seguro ativo — nunca agregado, para mostrar o progresso de cada meta individualmente. */
  seguros: SeguroResumo[]
  /** Um item por tipo de sócio ativo — nunca agregado, para mostrar o progresso de cada meta individualmente. */
  socios: SocioResumo[]
  evolucao: EvolucaoDia[]
  composicaoSeguros: ComposicaoSeguro[]
  composicaoSocios: ComposicaoSocio[]
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
  const [evolucao, composicaoSeguros, composicaoSocios, meta, tiposSeguro, tiposSocio] = await Promise.all([
    getEvolucaoDiaria(operadorId, mes, ano),
    getComposicaoSeguros(mes, ano, operadorId),
    getComposicaoSocios(mes, ano, operadorId),
    getMetaMensal(mes, ano),
    listTiposSeguro({ apenasAtivos: true }),
    listTiposSocio({ apenasAtivos: true }),
  ])

  const ultimoDia = evolucao[evolucao.length - 1]
  const realizadoDigitadas = ultimoDia?.acumuladoDigitadas ?? 0
  const realizadoContas = ultimoDia?.acumuladoContas ?? 0

  const metaDigitadas = meta?.metaDigitadas ?? 0
  const metaContas = meta?.metaContas ?? 0

  const realizadoPorSeguro = new Map(composicaoSeguros.map((c) => [c.tipoSeguroId, c.total]))
  const metaPorSeguro = new Map((meta?.metasSeguros ?? []).map((s) => [s.tipoSeguroId, s.quantidadeMeta]))

  const seguros: SeguroResumo[] = tiposSeguro.map((tipo) => {
    const realizado = realizadoPorSeguro.get(tipo.id) ?? 0
    const metaSeguro = metaPorSeguro.get(tipo.id) ?? 0
    return {
      tipoSeguroId: tipo.id,
      label: tipo.nome,
      realizado,
      meta: metaSeguro,
      percentual: percentual(realizado, metaSeguro),
    }
  })

  const realizadoPorSocio = new Map(composicaoSocios.map((c) => [c.tipoSocioId, c.total]))
  const metaPorSocio = new Map((meta?.metasSocios ?? []).map((s) => [s.tipoSocioId, s.quantidadeMeta]))

  const socios: SocioResumo[] = tiposSocio.map((tipo) => {
    const realizado = realizadoPorSocio.get(tipo.id) ?? 0
    const metaSocio = metaPorSocio.get(tipo.id) ?? 0
    return {
      tipoSocioId: tipo.id,
      label: tipo.nome,
      realizado,
      meta: metaSocio,
      percentual: percentual(realizado, metaSocio),
    }
  })

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
    seguros,
    socios,
    evolucao,
    composicaoSeguros,
    composicaoSocios,
  }
}

export type RelatorioExecutivo = {
  totalEquipe: {
    qtdDigitadas: number
    qtdContas: number
    totalSeguros: number
    totalSocios: number
  }
  metaEquipe: {
    metaDigitadas: number
    metaContas: number
    metaSegurosTotal: number
    metaSociosTotal: number
  }
  percentualGeralMeta: number
  melhorOperador: { operadorId: number; nome: string; percentualMeta: number } | null
  melhorSeguro: ComposicaoSeguro | null
  melhorSocio: ComposicaoSocio | null
  ranking: Awaited<ReturnType<typeof getRanking>>
  evolucaoEquipe: EvolucaoDia[]
  composicaoSeguros: ComposicaoSeguro[]
  composicaoSocios: ComposicaoSocio[]
}

/**
 * Visão executiva (seção 20). "Melhor operador" = 1º colocado no ranking
 * por percentual geral de atingimento de meta (mesma métrica documentada
 * em ranking.service.ts). "Melhor seguro"/"melhor sócio" = tipo com maior
 * quantidade lançada pela equipe no mês.
 */
export async function getRelatorioExecutivo(mes: number, ano: number): Promise<RelatorioExecutivo> {
  const [totaisPorOperador, ranking, evolucaoEquipe, composicaoSeguros, composicaoSocios] = await Promise.all([
    getTotaisMensalPorOperador(mes, ano),
    getRanking({ mes, ano, ordenarPor: "percentualMeta" }),
    getEvolucaoEquipe(mes, ano),
    getComposicaoSeguros(mes, ano),
    getComposicaoSocios(mes, ano),
  ])

  const totalEquipe = totaisPorOperador.reduce(
    (acc, op) => ({
      qtdDigitadas: acc.qtdDigitadas + op.qtdDigitadas,
      qtdContas: acc.qtdContas + op.qtdContas,
      totalSeguros: acc.totalSeguros + op.totalSeguros,
      totalSocios: acc.totalSocios + op.totalSocios,
    }),
    { qtdDigitadas: 0, qtdContas: 0, totalSeguros: 0, totalSocios: 0 }
  )

  const metaEquipe = ranking.reduce(
    (acc, item) => ({
      metaDigitadas: acc.metaDigitadas + item.metaDigitadas,
      metaContas: acc.metaContas + item.metaContas,
      metaSegurosTotal: acc.metaSegurosTotal + item.metaSegurosTotal,
      metaSociosTotal: acc.metaSociosTotal + item.metaSociosTotal,
    }),
    { metaDigitadas: 0, metaContas: 0, metaSegurosTotal: 0, metaSociosTotal: 0 }
  )

  const realizadoTotal =
    totalEquipe.qtdDigitadas + totalEquipe.qtdContas + totalEquipe.totalSeguros + totalEquipe.totalSocios
  const metaTotal =
    metaEquipe.metaDigitadas + metaEquipe.metaContas + metaEquipe.metaSegurosTotal + metaEquipe.metaSociosTotal
  const percentualGeralMeta = metaTotal > 0 ? Math.round((realizadoTotal / metaTotal) * 1000) / 10 : 0

  const melhorOperador = ranking[0]
    ? { operadorId: ranking[0].operadorId, nome: ranking[0].nome, percentualMeta: ranking[0].percentualMeta }
    : null

  const melhorSeguro = composicaoSeguros[0] ?? null
  const melhorSocio = composicaoSocios[0] ?? null

  return {
    totalEquipe,
    metaEquipe,
    percentualGeralMeta,
    melhorOperador,
    melhorSeguro,
    melhorSocio,
    ranking,
    evolucaoEquipe,
    composicaoSeguros,
    composicaoSocios,
  }
}
