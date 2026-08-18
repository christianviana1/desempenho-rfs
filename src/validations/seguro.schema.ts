import { z } from "zod"

export const createSeguroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do seguro.").max(120),
  ativo: z.boolean().default(true),
})

export const updateSeguroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do seguro.").max(120).optional(),
  ativo: z.boolean().optional(),
})

export type CreateSeguroInput = z.infer<typeof createSeguroSchema>
export type UpdateSeguroInput = z.infer<typeof updateSeguroSchema>
