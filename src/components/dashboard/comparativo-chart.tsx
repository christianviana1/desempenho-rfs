"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export type ComparativoDatum = { nome: string; valor: number }

/** Comparativo entre operadores para UMA métrica por vez — uma única cor, pois a variação é de magnitude, não de identidade. */
export function ComparativoChart({ data, label }: { data: ComparativoDatum[]; label: string }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 24 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="nome"
          tickLine={false}
          axisLine={false}
          stroke="var(--muted-foreground)"
          fontSize={12}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={56}
        />
        <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={12} width={40} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [String(value), label]}
        />
        <Bar dataKey="valor" name={label} fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
