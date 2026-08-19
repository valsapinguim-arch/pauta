import type { SVGProps } from 'react'

/**
 * Glifos mínimos usados pelos componentes — não fazem parte do inventário
 * fechado da Tarefa 3, decisão 2 (esse governa primitivas de interação, não
 * ilustrações). Traço único, `currentColor`, sem biblioteca de ícones: o
 * conjunto necessário é pequeno (menos de meia dúzia em todo o plano) e trazer
 * uma dependência para isto pesaria mais do que escrevê-los à mão.
 *
 * Decorativos por omissão (`aria-hidden`) — quem os usa fornece o texto
 * acessível (`aria-label` do botão, texto visível ao lado, etc.).
 */

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

export function MicIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

export function StopIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 21.5 20H2.5z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.1" fill="currentColor" strokeWidth={3} />
    </svg>
  )
}

/** Reprodução (Tarefa 14) — play/pause/metrónomo. `StopIcon`, já acima, é
 *  reutilizado para o botão de parar. */
export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4v16l14-8Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MetronomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 21h6l-2-15h-2Z" />
      <path d="M8 21h8" />
      <path d="M12 6V3" />
      <path d="M10.5 12 15 8" />
    </svg>
  )
}

/** Controlo de BPM (Tarefa 9) — evita introduzir um oitavo componente
 *  (`Input`) para um único campo numérico; um par +/− com `IconButton` já
 *  existente cobre o caso sem alargar o inventário fechado. */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function MinusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
