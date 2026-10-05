import { z } from "zod"

export const createSocioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do tipo de sócio.").max(120),
  ativo: z.boolean().default(true),
})

export const updateSocioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do tipo de sócio.").max(120).optional(),
  ativo: z.boolean().optional(),
})

export type CreateSocioInput = z.infer<typeof createSocioSchema>
export type UpdateSocioInput = z.infer<typeof updateSocioSchema>
