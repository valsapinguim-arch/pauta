/** `2024-03-15T10:30:00.000Z` → `"15/03/2024"` — só a data, sem hora: a
 *  lista ordena por precisão ao segundo, mas mostrar isso ao utilizador
 *  seria ruído (Tarefa 16). `pt-PT` como o resto dos textos da app. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' }).format(date)
}
