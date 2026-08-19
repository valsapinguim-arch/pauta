import { EXPORT } from './constants'

/** Caracteres inválidos em nomes de ficheiro nos sistemas de ficheiros
 *  comuns (Windows, macOS, Linux): barras, dois pontos, tubo e caracteres
 *  de controlo. Espaços e hífenes ficam de fora, são válidos em qualquer
 *  sistema de ficheiros comum. */
// eslint-disable-next-line no-control-regex -- o intervalo de controlo (0x00-0x1F) é o próprio alvo do filtro
const INVALID_FILESYSTEM_CHARS = /[\\/:*?"<>|\x00-\x1f]/g

/** Emoji e outros pictogramas: válidos como texto mas indesejáveis num
 *  nome de ficheiro pensado para abrir em software de notação externo
 *  (MuseScore, etc.), que nem sempre lida bem com eles. Acentos e outros
 *  caracteres latinos do título em pt-PT não são tocados por esta regra. */
const EMOJI = /\p{Extended_Pictographic}/gu

/** Reserva do Windows: um nome não pode terminar em ponto ou espaço. */
const TRAILING_DOT_OR_SPACE = /[.\s]+$/

/**
 * Título -> nome de ficheiro válido (Tarefa 15, decisão 7): caracteres
 * inválidos substituídos, comprimento limitado, nunca vazio. Sem extensão;
 * quem chama acrescenta .musicxml/.mid/.png/.pdf.
 */
export function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(EMOJI, '')
    .replace(INVALID_FILESYSTEM_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, EXPORT.MAX_FILENAME_LENGTH)
    .replace(TRAILING_DOT_OR_SPACE, '')

  return cleaned.length > 0 ? cleaned : EXPORT.FALLBACK_FILENAME
}
