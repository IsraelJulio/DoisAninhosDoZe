/** Erro de regra de negócio com mensagem amigável (pode ser mostrada ao usuário). */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}
