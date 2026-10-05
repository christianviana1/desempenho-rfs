"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DatePickerField } from "@/components/shared/date-picker-field"
import { apiFetch } from "@/lib/api-client"
import { toDateParam } from "@/lib/date-format"

type LinhaOperador = {
  qtdDigitadas: number
  qtdContas: number
  seguros: Record<number, number>
  socios: Record<number, number>
}

type FechamentoResponse = {
  data: string
  tiposSeguro: { id: number; nome: string }[]
  tiposSocio: { id: number; nome: string }[]
  operadores: {
    operadorId: number
    nome: string
    qtdDigitadas: number
    qtdContas: number
    seguros: Record<number, number>
    socios: Record<number, number>
  }[]
}

function linhaVazia(): LinhaOperador {
  return { qtdDigitadas: 0, qtdContas: 0, seguros: {}, socios: {} }
}

function somarRegistro(registro: Record<number, number>): number {
  return Object.values(registro).reduce((acc, v) => acc + v, 0)
}

export default function FechamentoDiarioPage() {
  const [data, setData] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tiposSeguro, setTiposSeguro] = useState<{ id: number; nome: string }[]>([])
  const [tiposSocio, setTiposSocio] = useState<{ id: number; nome: string }[]>([])
  const [operadores, setOperadores] = useState<{ operadorId: number; nome: string }[]>([])
  const [linhas, setLinhas] = useState<Record<number, LinhaOperador>>({})

  useEffect(() => {
    let ativo = true
    apiFetch<FechamentoResponse>(`/api/lancamentos/batch?data=${toDateParam(data)}`)
      .then((fechamento) => {
        if (!ativo) return
        setTiposSeguro(fechamento.tiposSeguro)
        setTiposSocio(fechamento.tiposSocio)
        setOperadores(fechamento.operadores.map((o) => ({ operadorId: o.operadorId, nome: o.nome })))
        const mapa: Record<number, LinhaOperador> = {}
        for (const op of fechamento.operadores) {
          mapa[op.operadorId] = {
            qtdDigitadas: op.qtdDigitadas,
            qtdContas: op.qtdContas,
            seguros: { ...op.seguros },
            socios: { ...op.socios },
          }
        }
        setLinhas(mapa)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [data])

  function atualizarLinha(operadorId: number, patch: Partial<Pick<LinhaOperador, "qtdDigitadas" | "qtdContas">>) {
    setLinhas((prev) => ({ ...prev, [operadorId]: { ...(prev[operadorId] ?? linhaVazia()), ...patch } }))
  }

  function atualizarSeguro(operadorId: number, tipoSeguroId: number, quantidade: number) {
    setLinhas((prev) => {
      const atual = prev[operadorId] ?? linhaVazia()
      return {
        ...prev,
        [operadorId]: { ...atual, seguros: { ...atual.seguros, [tipoSeguroId]: quantidade } },
      }
    })
  }

  function atualizarSocio(operadorId: number, tipoSocioId: number, quantidade: number) {
    setLinhas((prev) => {
      const atual = prev[operadorId] ?? linhaVazia()
      return {
        ...prev,
        [operadorId]: { ...atual, socios: { ...atual.socios, [tipoSocioId]: quantidade } },
      }
    })
  }

  const totais = useMemo(() => {
    let digitadas = 0
    let contas = 0
    const porSeguro: Record<number, number> = {}
    const porSocio: Record<number, number> = {}

    for (const op of operadores) {
      const linha = linhas[op.operadorId] ?? linhaVazia()
      digitadas += linha.qtdDigitadas
      contas += linha.qtdContas
      for (const tipo of tiposSeguro) {
        porSeguro[tipo.id] = (porSeguro[tipo.id] ?? 0) + (linha.seguros[tipo.id] ?? 0)
      }
      for (const tipo of tiposSocio) {
        porSocio[tipo.id] = (porSocio[tipo.id] ?? 0) + (linha.socios[tipo.id] ?? 0)
      }
    }

    return {
      digitadas,
      contas,
      porSeguro,
      porSocio,
      totalSeguros: somarRegistro(porSeguro),
      totalSocios: somarRegistro(porSocio),
    }
  }, [linhas, operadores, tiposSeguro, tiposSocio])

  async function handleSalvar() {
    setSaving(true)
    try {
      await apiFetch("/api/lancamentos/batch", {
        method: "POST",
        body: JSON.stringify({
          data: toDateParam(data),
          lancamentos: operadores.map((op) => {
            const linha = linhas[op.operadorId] ?? linhaVazia()
            return {
              operadorId: op.operadorId,
              qtdDigitadas: linha.qtdDigitadas,
              qtdContas: linha.qtdContas,
              seguros: tiposSeguro.map((tipo) => ({
                tipoSeguroId: tipo.id,
                quantidade: linha.seguros[tipo.id] ?? 0,
              })),
              socios: tiposSocio.map((tipo) => ({
                tipoSocioId: tipo.id,
                quantidade: linha.socios[tipo.id] ?? 0,
              })),
            }
          }),
        }),
      })
      toast.success("Fechamento diário salvo com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar fechamento.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Fechamento Diário</h1>
        <div className="flex items-center gap-3">
          <DatePickerField value={data} onChange={setData} disabled={(d) => d > new Date()} />
          <Button onClick={handleSalvar} disabled={saving || loading || operadores.length === 0}>
            {saving ? "Salvando..." : "Salvar Fechamento"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : operadores.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Nenhum operador ativo cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card">Operador</TableHead>
                  <TableHead className="text-right">Digitadas</TableHead>
                  <TableHead className="text-right">Contas</TableHead>
                  {tiposSeguro.map((tipo) => (
                    <TableHead key={tipo.id} className="text-right">
                      {tipo.nome}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total Seguros</TableHead>
                  {tiposSocio.map((tipo) => (
                    <TableHead key={tipo.id} className="text-right">
                      {tipo.nome}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total Sócios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operadores.map((op) => {
                  const linha = linhas[op.operadorId] ?? linhaVazia()
                  return (
                    <TableRow key={op.operadorId}>
                      <TableCell className="sticky left-0 bg-card font-medium">{op.nome}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-right"
                          value={linha.qtdDigitadas}
                          onChange={(e) =>
                            atualizarLinha(op.operadorId, { qtdDigitadas: Math.max(0, Number(e.target.value)) })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="w-20 text-right"
                          value={linha.qtdContas}
                          onChange={(e) =>
                            atualizarLinha(op.operadorId, { qtdContas: Math.max(0, Number(e.target.value)) })
                          }
                        />
                      </TableCell>
                      {tiposSeguro.map((tipo) => (
                        <TableCell key={tipo.id}>
                          <Input
                            type="number"
                            min={0}
                            className="w-20 text-right"
                            value={linha.seguros[tipo.id] ?? 0}
                            onChange={(e) => atualizarSeguro(op.operadorId, tipo.id, Math.max(0, Number(e.target.value)))}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium tabular-nums">
                        {somarRegistro(linha.seguros)}
                      </TableCell>
                      {tiposSocio.map((tipo) => (
                        <TableCell key={tipo.id}>
                          <Input
                            type="number"
                            min={0}
                            className="w-20 text-right"
                            value={linha.socios[tipo.id] ?? 0}
                            onChange={(e) => atualizarSocio(op.operadorId, tipo.id, Math.max(0, Number(e.target.value)))}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-medium tabular-nums">
                        {somarRegistro(linha.socios)}
                      </TableCell>
                    </TableRow>
                  )
                })}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell className="sticky left-0 bg-muted/50">TOTAL DO DIA</TableCell>
                  <TableCell className="text-right tabular-nums">{totais.digitadas}</TableCell>
                  <TableCell className="text-right tabular-nums">{totais.contas}</TableCell>
                  {tiposSeguro.map((tipo) => (
                    <TableCell key={tipo.id} className="text-right tabular-nums">
                      {totais.porSeguro[tipo.id] ?? 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">{totais.totalSeguros}</TableCell>
                  {tiposSocio.map((tipo) => (
                    <TableCell key={tipo.id} className="text-right tabular-nums">
                      {totais.porSocio[tipo.id] ?? 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">{totais.totalSocios}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
