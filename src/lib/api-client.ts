/** Wrapper de fetch para uso em Client Components: sempre JSON, sempre lança Error com a mensagem do backend em caso de falha. */
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data ? String(data.error) : "Erro inesperado."
    throw new Error(message)
  }

  return data as T
}
