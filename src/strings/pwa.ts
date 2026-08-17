/**
 * Textos do convite de instalação e do aviso de atualização — ver Tarefa 2.
 *
 * A interface aqui é propositadamente mínima (dois banners simples); a
 * Tarefa 3 substitui-os pelos componentes `Toast`/`Alert` do inventário
 * fechado, sem mudar o vocabulário.
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
  dismiss: 'Dispensar',
} as const
