"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MESES } from "@/lib/meses"

export function PeriodoSelect({
  mes,
  ano,
  onChange,
}: {
  mes: number
  ano: number
  onChange: (mes: number, ano: number) => void
}) {
  const anoAtual = new Date().getFullYear()
  const anos = Array.from({ length: 4 }, (_, i) => anoAtual - 2 + i)

  return (
    <div className="flex gap-2">
      <Select value={String(mes)} onValueChange={(value) => onChange(Number(value), ano)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MESES.map((nome, index) => (
            <SelectItem key={nome} value={String(index + 1)}>
              {nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(ano)} onValueChange={(value) => onChange(mes, Number(value))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {anos.map((a) => (
            <SelectItem key={a} value={String(a)}>
              {a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
