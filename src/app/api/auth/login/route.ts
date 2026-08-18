import { NextResponse, type NextRequest } from "next/server"

import { handleApiError } from "@/lib/api-error"
import { createSession } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"
import { Perfil } from "@/lib/session"
import { authenticateByLogin } from "@/services/auth.service"
import { loginSchema } from "@/validations/auth.schema"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { login } = loginSchema.parse(body)

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    const { allowed, retryAfterSeconds } = checkRateLimit(`${ip}:${login.toLowerCase()}`)
    if (!allowed) {
      return NextResponse.json(
        { error: `Muitas tentativas. Tente novamente em ${retryAfterSeconds}s.` },
        { status: 429 }
      )
    }

    const session = await authenticateByLogin(login)
    await createSession(session)

    const redirectTo = session.perfil === Perfil.ADMIN ? "/admin" : "/dashboard"
    return NextResponse.json({ redirectTo })
  } catch (error) {
    return handleApiError(error)
  }
}
