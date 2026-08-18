import "server-only"

import { cookies } from "next/headers"

import {
  Perfil,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session"

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions)
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  return verifySessionToken(token)
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

/** Garante que existe uma sessão válida. Lança AuthError (401) caso contrário. */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new AuthError("Sessão inválida ou expirada.", 401)
  }
  return session
}

/** Garante que a sessão pertence a um ADMIN. Lança AuthError (401/403). */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireAuth()
  if (session.perfil !== Perfil.ADMIN) {
    throw new AuthError("Acesso restrito a administradores.", 403)
  }
  return session
}
