import { z } from "zod"

export const periodoSchema = z.object({
  mes: z.coerce.number().int().min(1, "Mês inválido.").max(12, "Mês inválido."),
  ano: z.coerce.number().int().min(2000, "Ano inválido.").max(2100, "Ano inválido."),
})

export type PeriodoInput = z.infer<typeof periodoSchema>
