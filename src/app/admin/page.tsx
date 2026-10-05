"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BarChart3, ClipboardList } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PeriodoSelect } from "@/components/shared/period-select"
import { ComparativoChart } from "@/components/dashboard/comparativo-chart"
import { apiFetch } from "@/lib/api-client"
import type { RankingItem } from "@/services/ranking.service"
import type { TipoSeguro, TipoSocio } from "@/generated/prisma/client"

const OPCOES_METRICA = [
  { value: "digitadas", label: "Digitadas" },
  { value: "contas", label: "Contas" },
  { value: "seguros", label: "Total de Seguros" },
  { value: "socios", label: "Total de Sócios" },
]

export default function AdminOverviewPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [metrica, setMetrica] = useState("digitadas")
  const [tiposSeguro, setTiposSeguro] = useState<Pick<TipoSeguro, "id" | "nome">[]>([])
  const [tiposSocio, setTiposSocio] = useState<Pick<TipoSocio, "id" | "nome">[]>([])
  const [ranking, setRanking] = useState<RankingItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Pick<TipoSeguro, "id" | "nome">[]>("/api/seguros")
      .then(setTiposSeguro)
      .catch((error: Error) => toast.error(error.message))
    apiFetch<Pick<TipoSocio, "id" | "nome">[]>("/api/socios")
      .then(setTiposSocio)
      .catch((error: Error) => toast.error(error.message))
  }, [])

  useEffect(() => {
    let ativo = true
    apiFetch<RankingItem[]>(`/api/ranking?mes=${mes}&ano=${ano}&ordenarPor=${metrica}`)
      .then((data) => {
        if (ativo) setRanking(data)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [mes, ano, metrica])

  const totais = useMemo(() => {
    if (!ranking) return { digitadas: 0, contas: 0, seguros: 0, socios: 0 }
    return ranking.reduce(
      (acc, item) => ({
        digitadas: acc.digitadas + item.qtdDigitadas,
        contas: acc.contas + item.qtdContas,
        seguros: acc.seguros + item.totalSeguros,
        socios: acc.socios + item.totalSocios,
      }),
      { digitadas: 0, contas: 0, seguros: 0, socios: 0 }
    )
  }, [ranking])

  const metricaLabel = useMemo(() => {
    if (metrica.startsWith("seguro:")) {
      const id = Number(metrica.slice("seguro:".length))
      return tiposSeguro.find((t) => t.id === id)?.nome ?? "Seguro"
    }
    if (metrica.startsWith("socio:")) {
      const id = Number(metrica.slice("socio:".length))
      return tiposSocio.find((t) => t.id === id)?.nome ?? "Sócio"
    }
    return OPCOES_METRICA.find((o) => o.value === metrica)?.label ?? metrica
  }, [metrica, tiposSeguro, tiposSocio])

  const dadosComparativo = useMemo(
    () => (ranking ?? []).map((item) => ({ nome: item.nome, valor: item.valorMetricaPrincipal })),
    [ranking]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Visão Geral</h1>
        <PeriodoSelect
          mes={mes}
          ano={ano}
          onChange={(m, a) => {
            setMes(m)
            setAno(a)
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !ranking
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : [
              { label: "Digitadas", valor: totais.digitadas },
              { label: "Contas", valor: totais.contas },
              { label: "Seguros", valor: totais.seguros },
              { label: "Sócios", valor: totais.socios },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">{item.valor}</p>
                  <p className="text-xs text-muted-foreground">Total da equipe no mês</p>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Comparativo entre operadores</CardTitle>
            <Select value={metrica} onValueChange={setMetrica}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPCOES_METRICA.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
                {tiposSeguro.map((t) => (
                  <SelectItem key={`seguro:${t.id}`} value={`seguro:${t.id}`}>
                    {t.nome}
                  </SelectItem>
                ))}
                {tiposSocio.map((t) => (
                  <SelectItem key={`socio:${t.id}`} value={`socio:${t.id}`}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loading || !ranking ? (
              <Skeleton className="h-[340px] w-full" />
            ) : dadosComparativo.length === 0 ? (
              <p className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
                Nenhuma produção lançada neste período.
              </p>
            ) : (
              <ComparativoChart data={dadosComparativo} label={metricaLabel} />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Link href="/admin/fechamento">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 py-5">
                <ClipboardList className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Fechamento Diário</p>
                  <p className="text-xs text-muted-foreground">Lançar produção de todos os operadores</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/relatorios">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 py-5">
                <BarChart3 className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Visão Executiva</p>
                  <p className="text-xs text-muted-foreground">Relatório completo para apresentação</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
