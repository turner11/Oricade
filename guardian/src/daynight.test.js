import { describe, it, expect } from 'vitest'
import { PHASE_MS } from './game-config.js'
import { phaseAt } from './daynight.js'

describe('phaseAt', () => {
  it('starts in day and flips at each PHASE_MS boundary', () => {
    expect(phaseAt(0)).toBe('day')
    expect(phaseAt(PHASE_MS - 1)).toBe('day')
    expect(phaseAt(PHASE_MS)).toBe('night')
    expect(phaseAt(2 * PHASE_MS)).toBe('day')
  })

  it('keeps cycling past the first day', () => {
    expect(phaseAt(7 * PHASE_MS)).toBe('night')
    expect(phaseAt(8 * PHASE_MS)).toBe('day')
  })
})
