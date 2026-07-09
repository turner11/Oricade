import { describe, it, expect } from 'vitest'
import { noteFrequency } from './audio.js'

describe('noteFrequency', () => {
  it('is deterministic for a given level index', () => {
    expect(noteFrequency(2)).toBe(noteFrequency(2))
  })

  it('gives each of the 9 levels a distinct base frequency', () => {
    const freqs = Array.from({ length: 9 }, (_, i) => noteFrequency(i))
    expect(new Set(freqs).size).toBe(9)
  })

  it('returns positive, audible frequencies', () => {
    for (let i = 0; i < 9; i++) {
      const f = noteFrequency(i)
      expect(f).toBeGreaterThan(20)
      expect(f).toBeLessThan(20000)
    }
  })
})
