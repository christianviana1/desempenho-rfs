"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PeriodoSelect } from "@/components/shared/period-select"
import { StatCard } from "@/components/dashboard/stat-card"
import { EvolucaoChart } from "@/components/dashboard/evolucao-chart"
import { ComposicaoChart } from "@/components/dashboard/composicao-chart"
import { apiFetch } from "@/lib/api-client"
import type { ResumoOperador } from "@/services/dashboard.service"

export default function DashboardPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [resumo, setResumo] = useState<ResumoOperador | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ativo = true
    apiFetch<ResumoOperador>(`/api/dashboard/resumo?mes=${mes}&ano=${ano}`)
      .then((data) => {
        if (ativo) setResumo(data)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [mes, ano])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Meu Painel</h1>
        <PeriodoSelect mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a) }} />
      </div>

      {loading || !resumo ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard {...resumo.digitadas} />
            <StatCard {...resumo.contas} />
          </div>

          {resumo.seguros.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Seguros</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {resumo.seguros.map((seguro) => (
                  <StatCard key={seguro.tipoSeguroId} {...seguro} />
                ))}
              </div>
            </div>
          )}

          {resumo.socios.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Sócios</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {resumo.socios.map((socio) => (
                  <StatCard key={socio.tipoSocioId} {...socio} />
                ))}
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução no mês</CardTitle>
            </CardHeader>
            <CardContent>
              <EvolucaoChart data={resumo.evolucao} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Composição de seguros</CardTitle>
              </CardHeader>
              <CardContent>
                <ComposicaoChart
                  data={resumo.composicaoSeguros}
                  mensagemVazio="Nenhum lançamento de seguro no período."
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Composição de sócios</CardTitle>
              </CardHeader>
              <CardContent>
                <ComposicaoChart
                  data={resumo.composicaoSocios}
                  mensagemVazio="Nenhum lançamento de sócio no período."
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
