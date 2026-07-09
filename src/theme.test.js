import { describe, it, expect } from 'vitest'
import { PALETTE } from './theme.js'

describe('PALETTE', () => {
  it('defines a shared set of pastel/neon accent colors as valid hex numbers', () => {
    const keys = Object.keys(PALETTE)
    expect(keys.length).toBeGreaterThan(3)
    for (const key of keys) {
      expect(typeof PALETTE[key]).toBe('number')
      expect(PALETTE[key]).toBeGreaterThanOrEqual(0)
      expect(PALETTE[key]).toBeLessThanOrEqual(0xffffff)
    }
  })

  it('has no duplicate colors (each accent is visually distinct)', () => {
    const values = Object.values(PALETTE)
    expect(new Set(values).size).toBe(values.length)
  })
})
