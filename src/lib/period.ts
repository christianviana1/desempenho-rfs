/** Intervalo [inicio, fim) em UTC para o mês/ano informado — usado em filtros `data >= inicio AND data < fim`. */
export function monthRange(mes: number, ano: number): { inicio: Date; fim: Date } {
  const inicio = new Date(Date.UTC(ano, mes - 1, 1))
  const fim = new Date(Date.UTC(ano, mes, 1))
  return { inicio, fim }
}

export function daysInMonth(mes: number, ano: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}
