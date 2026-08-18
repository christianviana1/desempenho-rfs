"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PeriodoSelect } from "@/components/shared/period-select"
import { apiFetch } from "@/lib/api-client"
import type { RankingItem } from "@/services/ranking.service"
import type { TipoSeguro } from "@/generated/prisma/client"

const OPCOES_FIXAS = [
  { value: "digitadas", label: "Mais Digitadas" },
  { value: "contas", label: "Mais Contas" },
  { value: "socios", label: "Mais Sócios" },
  { value: "seguros", label: "Mais Seguros" },
  { value: "percentualMeta", label: "Melhor % da Meta" },
]

const MEDALHAS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

/** Ranking mensal, reutilizado em /admin/ranking e /dashboard/ranking. */
export function RankingTable() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [ordenarPor, setOrdenarPor] = useState("digitadas")
  const [tiposSeguro, setTiposSeguro] = useState<Pick<TipoSeguro, "id" | "nome">[]>([])
  const [ranking, setRanking] = useState<RankingItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Pick<TipoSeguro, "id" | "nome">[]>("/api/seguros")
      .then(setTiposSeguro)
      .catch((error: Error) => toast.error(error.message))
  }, [])

  useEffect(() => {
    let ativo = true
    apiFetch<RankingItem[]>(`/api/ranking?mes=${mes}&ano=${ano}&ordenarPor=${ordenarPor}`)
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
  }, [mes, ano, ordenarPor])

  const seguroSelecionado = useMemo(() => {
    if (!ordenarPor.startsWith("seguro:")) return null
    const id = Number(ordenarPor.slice("seguro:".length))
    return tiposSeguro.find((t) => t.id === id) ?? null
  }, [ordenarPor, tiposSeguro])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodoSelect
          mes={mes}
          ano={ano}
          onChange={(m, a) => {
            setMes(m)
            setAno(a)
          }}
        />
        <Select value={ordenarPor} onValueChange={setOrdenarPor}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPCOES_FIXAS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
            {tiposSeguro.map((t) => (
              <SelectItem key={t.id} value={`seguro:${t.id}`}>
                Mais {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading || !ranking ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma produção lançada neste período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-right">Digitadas</TableHead>
                  <TableHead className="text-right">Contas</TableHead>
                  <TableHead className="text-right">Sócios</TableHead>
                  <TableHead className="text-right">Seguros</TableHead>
                  {seguroSelecionado && (
                    <TableHead className="text-right">{seguroSelecionado.nome}</TableHead>
                  )}
                  <TableHead className="text-right">% Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((item) => (
                  <TableRow key={item.operadorId}>
                    <TableCell>
                      {MEDALHAS[item.posicao] ? (
                        <span className="text-lg" aria-label={`${item.posicao}º lugar`}>
                          {MEDALHAS[item.posicao]}
                        </span>
                      ) : (
                        <Badge variant="secondary">{item.posicao}º</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.qtdDigitadas}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.qtdContas}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.qtdSocios}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.totalSeguros}</TableCell>
                    {seguroSelecionado && (
                      <TableCell className="text-right tabular-nums">
                        {item.seguros[seguroSelecionado.id] ?? 0}
                      </TableCell>
                    )}
                    <TableCell className="text-right tabular-nums">{item.percentualMeta.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
