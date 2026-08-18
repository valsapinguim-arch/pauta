import styles from './ResultPlaceholderScore.module.css'

/**
 * Ilustração estática, só para a `ResultView` ter algo no lugar da pauta real
 * — ver prompts/tasks/03-interface-minima.md, Notas: "não tentar desenhar
 * notação à mão em SVG para fazer de conta". Isto não lê `ScoreDocument`
 * nenhum, não é um motor de notação, e desaparece por inteiro na Tarefa 13
 * (VexFlow). Puramente decorativo — `aria-hidden`, sem barrel a exportá-lo.
 */
export function ResultPlaceholderScore() {
  return (
    <svg
      className={styles.svg}
      viewBox="0 0 400 170"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {[0, 90].map((offsetY) => (
        <g key={offsetY} className={styles.system}>
          {[0, 12, 24, 36, 48].map((lineY) => (
            <line key={lineY} x1="10" y1={offsetY + lineY} x2="390" y2={offsetY + lineY} />
          ))}
          {[40, 90, 140, 190, 240, 290, 340].map((noteX, index) => (
            <ellipse
              key={noteX}
              className={styles.note}
              cx={noteX}
              cy={offsetY + 8 + ((index * 7) % 40)}
              rx="7"
              ry="5.5"
              transform={`rotate(-14 ${noteX} ${offsetY + 8 + ((index * 7) % 40)})`}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}
