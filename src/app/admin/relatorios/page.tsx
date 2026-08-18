"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PeriodoSelect } from "@/components/shared/period-select"
import { EvolucaoChart } from "@/components/dashboard/evolucao-chart"
import { ComposicaoSegurosChart } from "@/components/dashboard/composicao-seguros-chart"
import { apiFetch } from "@/lib/api-client"
import type { RelatorioExecutivo } from "@/services/dashboard.service"

const MEDALHAS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

export default function RelatoriosPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [relatorio, setRelatorio] = useState<RelatorioExecutivo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    apiFetch<RelatorioExecutivo>(`/api/relatorios/executivo?mes=${mes}&ano=${ano}`)
      .then((data) => {
        if (ativo) setRelatorio(data)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [mes, ano])

  const totalGeral = relatorio
    ? relatorio.totalEquipe.qtdDigitadas +
      relatorio.totalEquipe.qtdContas +
      relatorio.totalEquipe.qtdSocios +
      relatorio.totalEquipe.totalSeguros
    : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Visão Executiva</h1>
        <PeriodoSelect
          mes={mes}
          ano={ano}
          onChange={(m, a) => {
            setMes(m)
            setAno(a)
          }}
        />
      </div>

      {loading || !relatorio ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{totalGeral}</p>
                <p className="text-xs text-muted-foreground">Digitadas + Contas + Sócios + Seguros</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">% Geral das Metas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{relatorio.percentualGeralMeta.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Realizado sobre meta cadastrada</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Operador</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{relatorio.melhorOperador?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {relatorio.melhorOperador ? `${relatorio.melhorOperador.percentualMeta.toFixed(1)}% da meta` : "Sem dados"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Seguro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{relatorio.melhorSeguro?.nome ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {relatorio.melhorSeguro ? `${relatorio.melhorSeguro.total} unidades` : "Sem dados"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Evolução da equipe no mês</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolucaoChart data={relatorio.evolucaoEquipe} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Composição de seguros</CardTitle>
              </CardHeader>
              <CardContent>
                <ComposicaoSegurosChart data={relatorio.composicaoSeguros} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking (% de atingimento de meta)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead className="text-right">Digitadas</TableHead>
                    <TableHead className="text-right">Contas</TableHead>
                    <TableHead className="text-right">Sócios</TableHead>
                    <TableHead className="text-right">Seguros</TableHead>
                    <TableHead className="text-right">% Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatorio.ranking.slice(0, 10).map((item) => (
                    <TableRow key={item.operadorId}>
                      <TableCell>
                        {MEDALHAS[item.posicao] ? (
                          <span className="text-lg">{MEDALHAS[item.posicao]}</span>
                        ) : (
                          <Badge variant="secondary">{item.posicao}º</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.qtdDigitadas}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.qtdContas}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.qtdSocios}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.totalSeguros}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.percentualMeta.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
