/** Fração de `navigator.storage.estimate()` a partir da qual se avisa e
 *  sugere exportar (Tarefa 16, decisão 8). 0.9 dá alguma margem para a
 *  escrita que está prestes a acontecer — não é o limiar em que a escrita
 *  já vai falhar, é o limiar em que faz sentido começar a avisar. */
export const QUOTA_WARNING_RATIO = 0.9

/** Atraso do _debounce_ ao atualizar um registo já guardado (decisão 6) — a
 *  edição do título dispara a cada tecla; sem isto seria uma escrita no
 *  IndexedDB por caractere. */
export const UPDATE_DEBOUNCE_MS = 800
