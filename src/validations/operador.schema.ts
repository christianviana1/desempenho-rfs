import { z } from "zod"

// Importa de "enums" (não de "client") de propósito: esse arquivo é usado
// tanto no backend quanto em componentes client-side, e "client" carrega o
// runtime completo do Prisma (código Node-only), quebrando o bundle do browser.
import { Perfil } from "@/generated/prisma/enums"

const loginRegex = /^[a-z0-9._-]+$/i

export const createOperadorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120),
  login: z
    .string()
    .trim()
    .min(2, "Login muito curto.")
    .max(60)
    .regex(loginRegex, "Use apenas letras, números, ponto, hífen ou underline."),
  perfil: z.enum([Perfil.ADMIN, Perfil.OPERADOR]),
  ativo: z.boolean().default(true),
})

export const updateOperadorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome completo.").max(120).optional(),
  login: z
    .string()
    .trim()
    .min(2, "Login muito curto.")
    .max(60)
    .regex(loginRegex, "Use apenas letras, números, ponto, hífen ou underline.")
    .optional(),
  perfil: z.enum([Perfil.ADMIN, Perfil.OPERADOR]).optional(),
  ativo: z.boolean().optional(),
})

export type CreateOperadorInput = z.infer<typeof createOperadorSchema>
export type UpdateOperadorInput = z.infer<typeof updateOperadorSchema>
