import { z } from "zod"

import { periodoSchema } from "@/validations/periodo.schema"

const nonNegativeInt = z.number().int().min(0, "Não pode ser negativo.")

export const metaSeguroInputSchema = z.object({
  tipoSeguroId: z.number().int().positive(),
  quantidadeMeta: nonNegativeInt,
})

export const upsertMetaMensalSchema = z
  .object({
    operadorId: z.number().int().positive(),
    mes: z.number().int().min(1, "Mês inválido.").max(12, "Mês inválido."),
    ano: z.number().int().min(2000, "Ano inválido.").max(2100, "Ano inválido."),
    metaDigitadas: nonNegativeInt,
    metaContas: nonNegativeInt,
    metaSocios: nonNegativeInt,
    seguros: z.array(metaSeguroInputSchema),
  })
  .refine(
    (data) => new Set(data.seguros.map((s) => s.tipoSeguroId)).size === data.seguros.length,
    { message: "Cada tipo de seguro deve aparecer apenas uma vez.", path: ["seguros"] }
  )

export type UpsertMetaMensalInput = z.infer<typeof upsertMetaMensalSchema>

export const metaFiltroSchema = periodoSchema.extend({
  operadorId: z.coerce.number().int().positive().optional(),
})

export type MetaFiltroInput = z.infer<typeof metaFiltroSchema>
