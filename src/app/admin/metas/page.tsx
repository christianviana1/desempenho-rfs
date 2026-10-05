"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { PeriodoSelect } from "@/components/shared/period-select"
import { apiFetch } from "@/lib/api-client"
import type { TipoSeguro, TipoSocio } from "@/generated/prisma/client"

type MetaResponse = {
  metaDigitadas: number
  metaContas: number
  metasSeguros: { tipoSeguroId: number; quantidadeMeta: number }[]
  metasSocios: { tipoSocioId: number; quantidadeMeta: number }[]
} | null

export default function MetasPage() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [tiposSeguro, setTiposSeguro] = useState<Pick<TipoSeguro, "id" | "nome">[]>([])
  const [tiposSocio, setTiposSocio] = useState<Pick<TipoSocio, "id" | "nome">[]>([])

  const [metaDigitadas, setMetaDigitadas] = useState(0)
  const [metaContas, setMetaContas] = useState(0)
  const [metasSeguros, setMetasSeguros] = useState<Record<number, number>>({})
  const [metasSocios, setMetasSocios] = useState<Record<number, number>>({})

  const [loadingTipos, setLoadingTipos] = useState(true)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch<Pick<TipoSeguro, "id" | "nome">[]>("/api/seguros?ativos=true"),
      apiFetch<Pick<TipoSocio, "id" | "nome">[]>("/api/socios?ativos=true"),
    ])
      .then(([seguros, socios]) => {
        setTiposSeguro(seguros)
        setTiposSocio(socios)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoadingTipos(false))
  }, [])

  useEffect(() => {
    let ativo = true
    apiFetch<MetaResponse>(`/api/metas?mes=${mes}&ano=${ano}`)
      .then((meta) => {
        if (!ativo) return
        setMetaDigitadas(meta?.metaDigitadas ?? 0)
        setMetaContas(meta?.metaContas ?? 0)
        const mapaSeguros: Record<number, number> = {}
        for (const s of meta?.metasSeguros ?? []) mapaSeguros[s.tipoSeguroId] = s.quantidadeMeta
        setMetasSeguros(mapaSeguros)
        const mapaSocios: Record<number, number> = {}
        for (const s of meta?.metasSocios ?? []) mapaSocios[s.tipoSocioId] = s.quantidadeMeta
        setMetasSocios(mapaSocios)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoadingMeta(false)
      })
    return () => {
      ativo = false
    }
  }, [mes, ano])

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch("/api/metas", {
        method: "POST",
        body: JSON.stringify({
          mes,
          ano,
          metaDigitadas,
          metaContas,
          seguros: tiposSeguro.map((t) => ({ tipoSeguroId: t.id, quantidadeMeta: metasSeguros[t.id] ?? 0 })),
          socios: tiposSocio.map((t) => ({ tipoSocioId: t.id, quantidadeMeta: metasSocios[t.id] ?? 0 })),
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas Mensais</h1>
        <p className="text-sm text-muted-foreground">
          Meta individual do período — o mesmo alvo vale para todos os operadores ativos.
        </p>
      </div>

      <PeriodoSelect
        mes={mes}
        ano={ano}
        onChange={(m, a) => {
          setMes(m)
          setAno(a)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Metas do período</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMeta || loadingTipos ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
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

              {tiposSocio.length > 0 && (
                <div className="grid gap-3">
                  <Label className="text-muted-foreground">Meta por sócio</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tiposSocio.map((tipo) => (
                      <div key={tipo.id} className="grid gap-1.5">
                        <Label htmlFor={`meta-socio-${tipo.id}`} className="text-sm font-normal">
                          {tipo.nome}
                        </Label>
                        <Input
                          id={`meta-socio-${tipo.id}`}
                          type="number"
                          min={0}
                          value={metasSocios[tipo.id] ?? 0}
                          onChange={(e) =>
                            setMetasSocios((prev) => ({ ...prev, [tipo.id]: Math.max(0, Number(e.target.value)) }))
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
