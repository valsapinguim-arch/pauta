/**
 * Constantes de reprodução — Tarefa 14, mesma convenção de `QUANTIZE`
 * (Tarefa 10) e `TEMPO` (Tarefa 9): um só sítio.
 */
export const PLAYBACK = {
  /** Ataque e decaimento do envelope de cada nota (decisão 2 / Notas): um
   *  oscilador que começa ou para de forma abrupta estala — audível em cada
   *  nota, cumulativo ao longo de uma pauta inteira. */
  ATTACK_SEC: 0.01,
  RELEASE_SEC: 0.06,
  /** Ganho de pico de cada nota. Baixo de propósito: várias notas podem
   *  soar ao mesmo tempo (a última em decaimento e a seguinte em ataque) e
   *  osciladores somam-se linearmente — sem margem aqui o resultado distorce. */
  PEAK_GAIN: 0.25,

  /** Janela de antecipação do agendador (decisão 3): quanto tempo de
   *  eventos futuros fica agendado no relógio do `AudioContext` de cada vez
   *  que o agendador corre. */
  SCHEDULE_AHEAD_SEC: 0.2,
  /** Intervalo entre execuções do agendador periódico — só decide QUANDO
   *  verificar se há mais eventos para agendar; o agendamento em si usa
   *  sempre `audioContext.currentTime` (decisão 3), nunca este valor. */
  SCHEDULER_INTERVAL_MS: 50,

  MIN_SPEED: 0.5,
  MAX_SPEED: 1.5,
  DEFAULT_SPEED: 1,
  SPEED_STEP: 0.25,

  /** Clique do metrónomo (decisão 7): oscilador curto, sem envelope
   *  perceptível — não é uma nota musical, é um marcador de tempo. O tempo
   *  forte soa mais agudo para se distinguir dos restantes sem depender de
   *  volume. */
  METRONOME_CLICK_SEC: 0.03,
  METRONOME_FREQUENCY_HZ: 1000,
  METRONOME_ACCENT_FREQUENCY_HZ: 1600,
  METRONOME_GAIN: 0.4,
} as const
