/**
 * Textos do convite de instalação e do aviso de atualização — ver Tarefa 2.
 *
 * Mostrados através do componente `Toast` (Tarefa 3) — o próprio `Toast` já
 * tem um botão de fechar, por isso não há aqui nenhum texto de "dispensar"
 * separado.
 */

export const install = {
  message: 'Instala o pauta no teu dispositivo para o usares como app, mesmo sem internet.',
  action: 'Instalar',
  /* iOS Safari não tem "instalar num clique" — o único caminho é este gesto
     manual. Ver useInstallPrompt, isIosManualInstall. */
  iosMessage: 'Para instalar: toca em Partilhar e depois em "Adicionar ao ecrã principal".',
} as const

export const update = {
  message: 'Há uma versão nova do pauta.',
  action: 'Atualizar',
  offlineReadyMessage: 'O pauta já funciona offline.',
} as const
