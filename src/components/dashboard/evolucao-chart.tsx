"use client"

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { EvolucaoDia } from "@/services/producao.service"

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
}

/** Evolução acumulada no mês: dia no eixo X, produção acumulada no eixo Y, comparando as 4 métricas. */
export function EvolucaoChart({ data }: { data: EvolucaoDia[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="dia" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={12} width={40} />
        <Tooltip contentStyle={tooltipStyle} labelFormatter={(dia) => `Dia ${dia}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="acumuladoDigitadas"
          name="Digitadas"
          stroke="var(--viz-1)"
          fill="var(--viz-1)"
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="acumuladoContas"
          name="Contas"
          stroke="var(--viz-2)"
          fill="var(--viz-2)"
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="acumuladoSocios"
          name="Sócios"
          stroke="var(--viz-3)"
          fill="var(--viz-3)"
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="acumuladoSeguros"
          name="Seguros"
          stroke="var(--viz-4)"
          fill="var(--viz-4)"
          fillOpacity={0.12}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
