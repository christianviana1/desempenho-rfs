import { z } from "zod"

const nonNegativeInt = z.number().int().min(0, "Não pode ser negativo.")

/** Aceita "YYYY-MM-DD" e converte para meia-noite UTC, evitando deslocamento de fuso. */
export const dataSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .transform((value) => new Date(`${value}T00:00:00.000Z`))

export const lancamentoSeguroInputSchema = z.object({
  tipoSeguroId: z.number().int().positive(),
  quantidade: nonNegativeInt,
})

export const lancamentoSocioInputSchema = z.object({
  tipoSocioId: z.number().int().positive(),
  quantidade: nonNegativeInt,
})

const seguroArraySemDuplicados = z
  .array(lancamentoSeguroInputSchema)
  .refine((seguros) => new Set(seguros.map((s) => s.tipoSeguroId)).size === seguros.length, {
    message: "Cada tipo de seguro deve aparecer apenas uma vez.",
  })

const socioArraySemDuplicados = z
  .array(lancamentoSocioInputSchema)
  .refine((socios) => new Set(socios.map((s) => s.tipoSocioId)).size === socios.length, {
    message: "Cada tipo de sócio deve aparecer apenas uma vez.",
  })

export const upsertLancamentoDiarioSchema = z.object({
  data: dataSchema,
  qtdDigitadas: nonNegativeInt,
  qtdContas: nonNegativeInt,
  seguros: seguroArraySemDuplicados,
  socios: socioArraySemDuplicados,
})

export type UpsertLancamentoDiarioInput = z.infer<typeof upsertLancamentoDiarioSchema>

export const lancamentoBatchItemSchema = z.object({
  operadorId: z.number().int().positive(),
  qtdDigitadas: nonNegativeInt,
  qtdContas: nonNegativeInt,
  seguros: seguroArraySemDuplicados,
  socios: socioArraySemDuplicados,
})

export const lancamentoBatchSchema = z.object({
  data: dataSchema,
  lancamentos: z.array(lancamentoBatchItemSchema).min(1, "Nenhum lançamento informado."),
})

export type LancamentoBatchInput = z.infer<typeof lancamentoBatchSchema>
