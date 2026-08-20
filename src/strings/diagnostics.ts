/** Textos do ecrã de diagnóstico — Tarefa 21, Âmbito técnico. */
export const diagnostics = {
  openButton: 'Diagnóstico',
  title: 'Diagnóstico',
  closeButton: 'Fechar',

  deviceInfoTitle: 'Dispositivo e app',
  appVersionLabel: 'Versão da app',
  deviceTierLabel: 'Nível de dispositivo',
  deviceTierHigh: 'capaz',
  deviceTierLow: 'limitado',
  userAgentLabel: 'Browser',

  errorLogTitle: 'Registo de erros',
  errorLogEmpty: 'Sem erros registados.',
  errorLogNotice:
    'As últimas erros ficam guardados só neste dispositivo, para ajudar a perceber o que correu mal — nunca saem daqui.',
  copyButton: 'Copiar',
  copiedNotice: 'Copiado.',
  exportButton: 'Exportar como ficheiro',
  clearButton: 'Limpar registo',
  clearConfirmTitle: 'Limpar o registo de erros?',
  clearConfirmBody: 'Esta ação não pode ser desfeita.',
  clearConfirmCancel: 'Cancelar',
  clearConfirmAction: 'Limpar',

  telemetryTitle: 'Telemetria',
  telemetryBody:
    'Nada é enviado atualmente — esta app não tem nenhum destino configurado para dados de utilização. Se ligares isto, prepara-se só uma fila de eventos limitados (código de erro, duração em intervalos, tipo de entrada, nível de dispositivo, versão da app, tempos de processamento), sempre sem áudio, notas, títulos, nomes de ficheiro ou identificadores.',
  telemetryConsentLabel: 'Permitir recolha de telemetria (sem destino atual)',
} as const
