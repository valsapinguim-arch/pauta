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
