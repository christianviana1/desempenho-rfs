"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import type { ComposicaoSeguro } from "@/services/producao.service"

const CORES = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)"]

/** Composição de seguros (donut). Mais de 4 tipos dobra em "Outros" — identidade categórica tem teto de 4 cores. */
export function ComposicaoSegurosChart({ data }: { data: ComposicaoSeguro[] }) {
  const principais = data.slice(0, 4)
  const outros = data.slice(4)
  const totalOutros = outros.reduce((acc, s) => acc + s.total, 0)

  const fatias = [
    ...principais.map((s) => ({ nome: s.nome, total: s.total })),
    ...(totalOutros > 0 ? [{ nome: "Outros", total: totalOutros }] : []),
  ]

  if (fatias.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
        Nenhum lançamento de seguro no período.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={fatias} dataKey="total" nameKey="nome" innerRadius={60} outerRadius={100} paddingAngle={2}>
          {fatias.map((entry, index) => (
            <Cell key={entry.nome} fill={index < 4 ? CORES[index] : "var(--viz-muted)"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
