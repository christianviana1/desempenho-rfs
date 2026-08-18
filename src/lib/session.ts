import { SignJWT, jwtVerify } from "jose"

/**
 * Lógica de sessão sem dependência de `next/headers` nem do Prisma Client
 * gerado, para poder ser importada pelo middleware (Edge Runtime — que não
 * suporta o Prisma Client) e pelos Route Handlers/Server Actions.
 *
 * `Perfil` é redeclarado aqui (em vez de importado de "@/generated/prisma")
 * de propósito: deve permanecer em sincronia com o enum `Perfil` do
 * prisma/schema.prisma, mas sem criar uma dependência de import que puxaria
 * o client do Prisma para o bundle do middleware.
 */
export const Perfil = { ADMIN: "ADMIN", OPERADOR: "OPERADOR" } as const
export type Perfil = (typeof Perfil)[keyof typeof Perfil]

export const SESSION_COOKIE_NAME = "session"
export const SESSION_TTL_SECONDS = 60 * 60 * 8 // 8 horas

export type SessionPayload = {
  operadorId: number
  perfil: Perfil
  nome: string
  login: string
}

function getSecretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET não configurado ou muito curto (mínimo 32 caracteres). Defina essa variável de ambiente."
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey())
}

function isPerfil(value: unknown): value is Perfil {
  return value === Perfil.ADMIN || value === Perfil.OPERADOR
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecretKey())

    if (
      typeof payload.operadorId !== "number" ||
      !isPerfil(payload.perfil) ||
      typeof payload.nome !== "string" ||
      typeof payload.login !== "string"
    ) {
      return null
    }

    return {
      operadorId: payload.operadorId,
      perfil: payload.perfil,
      nome: payload.nome,
      login: payload.login,
    }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
}
