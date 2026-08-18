/**
 * Conversão para o parâmetro "YYYY-MM-DD" usado pela API, a partir das
 * partes LOCAIS da data (nunca `toISOString()`, que converteria para UTC e
 * poderia deslocar o dia exibido no calendário para o dia anterior/seguinte).
 */
export function toDateParam(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
