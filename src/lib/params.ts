import { ServiceError } from "@/lib/errors"

export function parseIdParam(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceError("ID inválido.", 400)
  }
  return id
}
