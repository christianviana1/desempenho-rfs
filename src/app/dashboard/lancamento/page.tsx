"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { DatePickerField } from "@/components/shared/date-picker-field"
import { apiFetch } from "@/lib/api-client"
import { toDateParam } from "@/lib/date-format"
import type { TipoSeguro, TipoSocio } from "@/generated/prisma/client"

type LancamentoResponse = {
  qtdDigitadas: number
  qtdContas: number
  seguros: { tipoSeguroId: number; quantidade: number }[]
  socios: { tipoSocioId: number; quantidade: number }[]
} | null

export default function LancamentoOperadorPage() {
  const [data, setData] = useState(() => new Date())
  const [tiposSeguro, setTiposSeguro] = useState<Pick<TipoSeguro, "id" | "nome">[]>([])
  const [tiposSocio, setTiposSocio] = useState<Pick<TipoSocio, "id" | "nome">[]>([])
  const [qtdDigitadas, setQtdDigitadas] = useState(0)
  const [qtdContas, setQtdContas] = useState(0)
  const [seguros, setSeguros] = useState<Record<number, number>>({})
  const [socios, setSocios] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
    apiFetch<LancamentoResponse>(`/api/lancamentos?data=${toDateParam(data)}`)
      .then((lancamento) => {
        if (!ativo) return
        setQtdDigitadas(lancamento?.qtdDigitadas ?? 0)
        setQtdContas(lancamento?.qtdContas ?? 0)
        const mapaSeguros: Record<number, number> = {}
        for (const s of lancamento?.seguros ?? []) mapaSeguros[s.tipoSeguroId] = s.quantidade
        setSeguros(mapaSeguros)
        const mapaSocios: Record<number, number> = {}
        for (const s of lancamento?.socios ?? []) mapaSocios[s.tipoSocioId] = s.quantidade
        setSocios(mapaSocios)
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => {
        if (ativo) setLoading(false)
      })
    return () => {
      ativo = false
    }
  }, [data])

  async function handleSave() {
    setSaving(true)
    try {
      await apiFetch("/api/lancamentos", {
        method: "POST",
        body: JSON.stringify({
          data: toDateParam(data),
          qtdDigitadas,
          qtdContas,
          seguros: tiposSeguro.map((t) => ({ tipoSeguroId: t.id, quantidade: seguros[t.id] ?? 0 })),
          socios: tiposSocio.map((t) => ({ tipoSocioId: t.id, quantidade: socios[t.id] ?? 0 })),
        }),
      })
      toast.success("Produção salva com sucesso.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Lançar Produção</h1>
        <DatePickerField value={data} onChange={setData} disabled={(d) => d > new Date()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produção do dia</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="digitadas">Digitadas</Label>
                  <Input
                    id="digitadas"
                    type="number"
                    min={0}
                    value={qtdDigitadas}
                    onChange={(e) => setQtdDigitadas(Math.max(0, Number(e.target.value)))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contas">Contas</Label>
                  <Input
                    id="contas"
                    type="number"
                    min={0}
                    value={qtdContas}
                    onChange={(e) => setQtdContas(Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </div>

              {tiposSeguro.length > 0 && (
                <div className="grid gap-3">
                  <Label className="text-muted-foreground">Seguros</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tiposSeguro.map((tipo) => (
                      <div key={tipo.id} className="grid gap-1.5">
                        <Label htmlFor={`seguro-${tipo.id}`} className="text-sm font-normal">
                          {tipo.nome}
                        </Label>
                        <Input
                          id={`seguro-${tipo.id}`}
                          type="number"
                          min={0}
                          value={seguros[tipo.id] ?? 0}
                          onChange={(e) =>
                            setSeguros((prev) => ({ ...prev, [tipo.id]: Math.max(0, Number(e.target.value)) }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tiposSocio.length > 0 && (
                <div className="grid gap-3">
                  <Label className="text-muted-foreground">Sócios</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {tiposSocio.map((tipo) => (
                      <div key={tipo.id} className="grid gap-1.5">
                        <Label htmlFor={`socio-${tipo.id}`} className="text-sm font-normal">
                          {tipo.nome}
                        </Label>
                        <Input
                          id={`socio-${tipo.id}`}
                          type="number"
                          min={0}
                          value={socios[tipo.id] ?? 0}
                          onChange={(e) =>
                            setSocios((prev) => ({ ...prev, [tipo.id]: Math.max(0, Number(e.target.value)) }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-fit">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
