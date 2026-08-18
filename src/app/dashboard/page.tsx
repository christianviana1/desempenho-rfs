"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PeriodoSelect } from "@/components/shared/period-select"
import { StatCard } from "@/components/dashboard/stat-card"
import { EvolucaoChart } from "@/components/dashboard/evolucao-chart"
import { ComposicaoSegurosChart } from "@/components/dashboard/composicao-seguros-chart"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard {...resumo.digitadas} />
            <StatCard {...resumo.contas} />
            <StatCard {...resumo.socios} />
            <StatCard {...resumo.seguros} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Evolução no mês</CardTitle>
              </CardHeader>
              <CardContent>
                <EvolucaoChart data={resumo.evolucao} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Composição de seguros</CardTitle>
              </CardHeader>
              <CardContent>
                <ComposicaoSegurosChart data={resumo.composicaoSeguros} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
