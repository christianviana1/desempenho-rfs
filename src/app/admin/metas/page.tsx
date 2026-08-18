"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PeriodoSelect } from "@/components/shared/period-select"
import { apiFetch } from "@/lib/api-client"
import type { Operador, TipoSeguro } from "@/generated/prisma/client"

type MetaResponse = {
  metaDigitadas: number
  metaContas: number
  metaSocios: number
  metasSeguros: { tipoSeguroId: number; quantidadeMeta: number }[]
}

export default function MetasPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [operadores, setOperadores] = useState<Operador[]>([])
  const [operadorId, setOperadorId] = useState<number | null>(null)
  const [tiposSeguro, setTiposSeguro] = useState<Pick<TipoSeguro, "id" | "nome">[]>([])

  const [metaDigitadas, setMetaDigitadas] = useState(0)
  const [metaContas, setMetaContas] = useState(0)
  const [metaSocios, setMetaSocios] = useState(0)
  const [metasSeguros, setMetasSeguros] = useState<Record<number, number>>({})

  const [loadingBase, setLoadingBase] = useState(true)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch<Operador[]>("/api/operadores?ativos=true"),
      apiFetch<Pick<TipoSeguro, "id" | "nome">[]>("/api/seguros?ativos=true"),
    ])
      .then(([ops, tipos]) => {
        setOperadores(ops)
        setTiposSeguro(tipos)
        if (ops.length > 0) setOperadorId(ops[0].id)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoadingBase(false))
  }, [])

  useEffect(() => {
    if (!operadorId) return
    let ativo = true
    apiFetch<MetaResponse[]>(`/api/metas?mes=${mes}&ano=${ano}&operadorId=${operadorId}`)
      .then((metas) => {
        if (!ativo) return
        const meta = metas[0]
        setMetaDigitadas(meta?.metaDigitadas ?? 0)
        setMetaContas(meta?.metaContas ?? 0)
        setMetaSocios(meta?.metaSocios ?? 0)
        const mapa: Record<number, number> = {}
        for (const s of meta?.metasSeguros ?? []) mapa[s.tipoSeguroId] = s.quantidadeMeta
        setMetasSeguros(mapa)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoadingMeta(false)
      })
    return () => {
      ativo = false
    }
  }, [operadorId, mes, ano])

  async function handleSave() {
    if (!operadorId) return
    setSaving(true)
    try {
      await apiFetch("/api/metas", {
        method: "POST",
        body: JSON.stringify({
          operadorId,
          mes,
          ano,
          metaDigitadas,
          metaContas,
          metaSocios,
          seguros: tiposSeguro.map((t) => ({ tipoSeguroId: t.id, quantidadeMeta: metasSeguros[t.id] ?? 0 })),
        }),
      })
      toast.success("Meta salva com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar meta.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Metas Mensais</h1>

      <div className="flex flex-wrap items-center gap-3">
        <PeriodoSelect
          mes={mes}
          ano={ano}
          onChange={(m, a) => {
            setMes(m)
            setAno(a)
          }}
        />
        {loadingBase ? (
          <Skeleton className="h-8 w-56" />
        ) : (
          <Select
            value={operadorId ? String(operadorId) : undefined}
            onValueChange={(v) => setOperadorId(Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Selecione o operador" />
            </SelectTrigger>
            <SelectContent>
              {operadores.map((op) => (
                <SelectItem key={op.id} value={String(op.id)}>
                  {op.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas do período</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMeta ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !operadorId ? (
            <p className="text-sm text-muted-foreground">Cadastre um operador ativo para definir metas.</p>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="meta-digitadas">Meta de Digitadas</Label>
                  <Input
                    id="meta-digitadas"
                    type="number"
                    min={0}
                    value={metaDigitadas}
                    onChange={(e) => setMetaDigitadas(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meta-contas">Meta de Contas</Label>
                  <Input
                    id="meta-contas"
                    type="number"
                    min={0}
                    value={metaContas}
                    onChange={(e) => setMetaContas(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="meta-socios">Meta de Sócios</Label>
                  <Input
                    id="meta-socios"
                    type="number"
                    min={0}
                    value={metaSocios}
                    onChange={(e) => setMetaSocios(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              {tiposSeguro.length > 0 && (
                <div className="grid gap-3">
                  <Label className="text-muted-foreground">Meta por seguro</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tiposSeguro.map((tipo) => (
                      <div key={tipo.id} className="grid gap-1.5">
                        <Label htmlFor={`meta-seguro-${tipo.id}`} className="text-sm font-normal">
                          {tipo.nome}
                        </Label>
                        <Input
                          id={`meta-seguro-${tipo.id}`}
                          type="number"
                          min={0}
                          value={metasSeguros[tipo.id] ?? 0}
                          onChange={(e) =>
                            setMetasSeguros((prev) => ({ ...prev, [tipo.id]: Math.max(0, Number(e.target.value)) }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-fit">
                {saving ? "Salvando..." : "Salvar Metas"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
