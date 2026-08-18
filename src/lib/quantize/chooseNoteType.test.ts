import { describe, expect, it } from 'vitest'
import { chooseNoteType } from './chooseNoteType'

describe('chooseNoteType', () => {
  it('escolhe a figura exata', () => {
    expect(chooseNoteType(480)).toEqual({ noteType: 'quarter', dots: 0 })
  })

  it('1.5 tempos dá semínima com ponto', () => {
    expect(chooseNoteType(720)).toEqual({ noteType: 'quarter', dots: 1 })
  })

  it('promove uma duração muito curta a semicorchea', () => {
    expect(chooseNoteType(5)).toEqual({ noteType: 'sixteenth', dots: 0 })
  })
})
