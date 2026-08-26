import { describe, it, expect } from 'vitest'
import { CUES, cueFor } from './audio.js'

const WAVEFORMS = ['sine', 'square', 'sawtooth', 'triangle']
const SCOPE_CUES = ['footstep', 'door', 'pickup', 'ui', 'bgm-day', 'bgm-night']

describe('cueFor', () => {
  it('has a cue for every event named in the issue scope', () => {
    for (const name of SCOPE_CUES) {
      expect(cueFor(name)).toBeDefined()
    }
  })

  it('gives day and night BGM audibly different frequencies', () => {
    expect(cueFor('bgm-day').freq).not.toBe(cueFor('bgm-night').freq)
  })

  it('keeps every cue in the audible range with a usable envelope', () => {
    for (const name of Object.keys(CUES)) {
      const cue = cueFor(name)
      expect(Number.isFinite(cue.freq)).toBe(true)
      expect(cue.freq).toBeGreaterThan(20)
      expect(cue.freq).toBeLessThan(20000)
      expect(WAVEFORMS).toContain(cue.type)
      if (!name.startsWith('bgm-')) {
        expect(cue.duration).toBeGreaterThan(0)
      }
    }
  })

  it('returns undefined for an unknown cue name', () => {
    expect(cueFor('nope')).toBeUndefined()
  })
})
