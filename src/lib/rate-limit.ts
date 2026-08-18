import "server-only"

/**
 * Rate limiter em memória, adequado para uma instância única do Next.js
 * (não há Redis no escopo deste projeto). Em um deploy com múltiplas
 * réplicas, cada instância mantém sua própria contagem — suficiente para
 * mitigar força bruta no login sem introduzir uma dependência externa.
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 5 * 60 * 1000 // 5 minutos
const MAX_ATTEMPTS = 10

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

// Evita que o Map cresça indefinidamente em processos de longa duração.
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}, WINDOW_MS).unref?.()
