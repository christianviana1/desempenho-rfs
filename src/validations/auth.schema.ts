import { z } from "zod"

export const loginSchema = z.object({
  login: z
    .string()
    .trim()
    .min(1, "Informe o login.")
    .max(60, "Login muito longo."),
})

export type LoginInput = z.infer<typeof loginSchema>
