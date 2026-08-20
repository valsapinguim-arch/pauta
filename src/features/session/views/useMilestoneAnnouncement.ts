import { useEffect, useRef, useState } from 'react'
import type { ProcessingStage } from '@/features/session/session.types'
import { processing } from '@/strings'

/** Marcos anunciados (Tarefa 18, decisão 2) — 25/50/75/100%, nunca a cada
 *  atualização de `progress`: um `aria-live` ligado a uma percentagem que
 *  muda dez vezes por segundo torna a app inutilizável com leitor de ecrã. */
const MILESTONES = [0.25, 0.5, 0.75, 1] as const

/**
 * Texto para um `aria-live="polite"` que só muda ao cruzar um marco de
 * progresso — `ProcessingView`. Reinicia os marcos já anunciados quando a
 * etapa muda (`stage`), porque o `progress` de Tarefa 6/7/9 volta a 0 no
 * início de cada etapa (ver `session.types.ts`).
 */
export function useMilestoneAnnouncement(stage: ProcessingStage, progress: number): string {
  const [announcement, setAnnouncement] = useState('')
  const lastMilestoneRef = useRef(0)
  const stageRef = useRef(stage)

  useEffect(() => {
    if (stageRef.current !== stage) {
      stageRef.current = stage
      lastMilestoneRef.current = 0
    }

    const crossed = [...MILESTONES]
      .reverse()
      .find((milestone) => progress >= milestone && milestone > lastMilestoneRef.current)
    if (crossed === undefined) return

    lastMilestoneRef.current = crossed
    setAnnouncement(
      crossed === 1 ? processing.milestoneComplete : processing.milestoneReached(crossed * 100),
    )
  }, [stage, progress])

  return announcement
}
