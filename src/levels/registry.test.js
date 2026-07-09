import { describe, it, expect } from 'vitest'
import { LEVELS, getLevel, describeMechanics } from './registry.js'

const REQUIRED_FIELDS = ['id', 'theme', 'perspective', 'objective', 'mechanics', 'createRuntime']

describe('LEVELS', () => {
  it('is a non-empty array of level configs matching the SPEC.md Level Matrix schema', () => {
    expect(LEVELS.length).toBeGreaterThan(0)
    for (const level of LEVELS) {
      for (const field of REQUIRED_FIELDS) expect(level).toHaveProperty(field)
      expect(Array.isArray(level.mechanics)).toBe(true)
      expect(typeof level.createRuntime).toBe('function')
    }
  })

  it('includes the Soccer level per the Level Matrix', () => {
    const soccer = LEVELS.find((l) => l.theme === 'Soccer')
    expect(soccer).toBeDefined()
    expect(soccer.objective).toBe('Score 3 goals before time expires')
    expect(soccer.mechanics).toEqual(['move', 'shoot'])
  })

  it('includes the Basketball level per the Level Matrix', () => {
    const basketball = LEVELS.find((l) => l.theme === 'Basketball')
    expect(basketball).toBeDefined()
    expect(basketball.objective).toBe('Reach a 10-point threshold')
    expect(basketball.mechanics).toEqual(['move', 'jump', 'shoot'])
  })
})

describe('getLevel', () => {
  it('returns the level config at the given index', () => {
    expect(getLevel(0)).toBe(LEVELS[0])
  })

  it('defaults to the first level when no index is given', () => {
    expect(getLevel()).toBe(LEVELS[0])
  })
})

describe('describeMechanics', () => {
  it('joins mechanic labels for the interstitial controls hint', () => {
    expect(describeMechanics(['move', 'jump', 'crouch'])).toBe('Move / Jump / Crouch')
  })

  it('supports all five SPEC.md mechanics', () => {
    expect(describeMechanics(['move', 'jump', 'shoot', 'crouch', 'magic'])).toBe(
      'Move / Jump / Shoot / Crouch / Magic Spell',
    )
  })
})
