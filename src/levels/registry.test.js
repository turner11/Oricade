import { describe, it, expect } from 'vitest'
import { LEVELS, getLevel, describeMechanics } from './registry.js'

const REQUIRED_FIELDS = ['id', 'theme', 'perspective', 'objective', 'mechanics', 'markerPosition']

describe('LEVELS', () => {
  it('is a non-empty array of level configs matching the SPEC.md Level Matrix schema', () => {
    expect(LEVELS.length).toBeGreaterThan(0)
    for (const level of LEVELS) {
      for (const field of REQUIRED_FIELDS) expect(level).toHaveProperty(field)
      expect(Array.isArray(level.mechanics)).toBe(true)
      expect(level.markerPosition).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) }))
    }
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
