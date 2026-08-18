export class ServiceError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "ServiceError"
    this.status = status
  }
}

export class NotFoundError extends ServiceError {
  constructor(message = "Registro não encontrado.") {
    super(message, 404)
  }
}

export class ConflictError extends ServiceError {
  constructor(message = "Conflito de dados.") {
    super(message, 409)
  }
}
