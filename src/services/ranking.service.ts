import "server-only"

import { getMetaMensal } from "@/services/meta.service"
import { getTotaisMensalPorOperador } from "@/services/producao.service"

export type RankingOrdenarPor =
  | "digitadas"
  | "contas"
  | "socios"
  | "seguros"
  | "percentualMeta"
  | { seguroId: number }
  | { socioId: number }

export type RankingItem = {
  posicao: number
  operadorId: number
  nome: string
  qtdDigitadas: number
  qtdContas: number
  totalSeguros: number
  seguros: Record<number, number>
  totalSocios: number
  socios: Record<number, number>
  metaDigitadas: number
  metaContas: number
  metaSegurosTotal: number
  metaSociosTotal: number
  /** percentual geral de atingimento de meta — ver documentação em getRanking() */
  percentualMeta: number
  /** valor da métrica escolhida em `ordenarPor`, exposto para a coluna de destaque na UI */
  valorMetricaPrincipal: number
}

export function parseOrdenarPor(valor: string | null): RankingOrdenarPor {
  if (!valor) return "digitadas"
  if (valor.startsWith("seguro:")) {
    const seguroId = Number(valor.slice("seguro:".length))
    if (Number.isFinite(seguroId) && seguroId > 0) return { seguroId }
  }
  if (valor.startsWith("socio:")) {
    const socioId = Number(valor.slice("socio:".length))
    if (Number.isFinite(socioId) && socioId > 0) return { socioId }
  }
  if (
    valor === "digitadas" ||
    valor === "contas" ||
    valor === "socios" ||
    valor === "seguros" ||
    valor === "percentualMeta"
  ) {
    return valor
  }
  return "digitadas"
}

function metricaPrincipal(
  item: Omit<RankingItem, "posicao" | "valorMetricaPrincipal">,
  ordenarPor: RankingOrdenarPor
): number {
  if (typeof ordenarPor === "object") {
    return "seguroId" in ordenarPor ? (item.seguros[ordenarPor.seguroId] ?? 0) : (item.socios[ordenarPor.socioId] ?? 0)
  }
  switch (ordenarPor) {
    case "digitadas":
      return item.qtdDigitadas
    case "contas":
      return item.qtdContas
    case "socios":
      return item.totalSocios
    case "seguros":
      return item.totalSeguros
    case "percentualMeta":
      return item.percentualMeta
  }
}

/**
 * Ranking mensal dos operadores ativos.
 *
 * REGRA DE DESEMPATE (documentada conforme seção 17 do escopo):
 *   1. Métrica principal selecionada em `ordenarPor`, decrescente;
 *   2. Percentual geral de atingimento de meta, decrescente;
 *   3. Total de seguros no mês, decrescente;
 *   4. Nome do operador, ordem alfabética crescente.
 *
 * O "percentual geral de atingimento de meta" (critério 2) é sempre
 * calculado da mesma forma, independente da métrica principal escolhida:
 * soma(digitadas + contas + total de seguros + total de sócios realizados)
 * dividido pela soma das respectivas metas (0 quando a soma de metas é 0,
 * para não favorecer operadores sem nenhuma meta cadastrada).
 *
 * A meta é individual e única por período (o mesmo alvo vale para todos os
 * operadores ativos, não é configurada por operador — ver meta.service.ts),
 * então o mesmo objeto de meta é aplicado a cada item do ranking.
 */
export async function getRanking(params: {
  mes: number
  ano: number
  ordenarPor: RankingOrdenarPor
}): Promise<RankingItem[]> {
  const { mes, ano, ordenarPor } = params

  const [totais, meta] = await Promise.all([getTotaisMensalPorOperador(mes, ano), getMetaMensal(mes, ano)])

  const metaSegurosTotal = meta?.metasSeguros.reduce((acc, s) => acc + s.quantidadeMeta, 0) ?? 0
  const metaSociosTotal = meta?.metasSocios.reduce((acc, s) => acc + s.quantidadeMeta, 0) ?? 0
  const metaDigitadas = meta?.metaDigitadas ?? 0
  const metaContas = meta?.metaContas ?? 0

  const itensSemPosicao = totais.map((total) => {
    const realizadoTotal = total.qtdDigitadas + total.qtdContas + total.totalSeguros + total.totalSocios
    const metaTotal = metaDigitadas + metaContas + metaSegurosTotal + metaSociosTotal
    const percentualMeta = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0

    return {
      operadorId: total.operadorId,
      nome: total.nome,
      qtdDigitadas: total.qtdDigitadas,
      qtdContas: total.qtdContas,
      totalSeguros: total.totalSeguros,
      seguros: total.seguros,
      totalSocios: total.totalSocios,
      socios: total.socios,
      metaDigitadas,
      metaContas,
      metaSegurosTotal,
      metaSociosTotal,
      percentualMeta,
    }
  })

  const comMetrica = itensSemPosicao.map((item) => ({
    ...item,
    valorMetricaPrincipal: metricaPrincipal(item, ordenarPor),
  }))

  comMetrica.sort((a, b) => {
    if (b.valorMetricaPrincipal !== a.valorMetricaPrincipal) {
      return b.valorMetricaPrincipal - a.valorMetricaPrincipal
    }
    if (b.percentualMeta !== a.percentualMeta) {
      return b.percentualMeta - a.percentualMeta
    }
    if (b.totalSeguros !== a.totalSeguros) {
      return b.totalSeguros - a.totalSeguros
    }
    return a.nome.localeCompare(b.nome, "pt-BR")
  })

  return comMetrica.map((item, index) => ({ ...item, posicao: index + 1 }))
}
