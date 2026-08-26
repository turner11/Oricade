import { describe, it, expect } from 'vitest'
import { CUES, cueFor, stopBgm } from './audio.js'

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

describe('stopBgm', () => {
  // Fake oscillator: just enough to prove stopBgm() calls both stop() and disconnect() on it.
  const fakeOsc = () => {
    const calls = []
    return { calls, stop: () => calls.push('stop'), disconnect: () => calls.push('disconnect') }
  }

  it('is a no-op returning null when there is no previous oscillator (first-ever call)', () => {
    expect(stopBgm(null)).toBeNull()
  })

  it('stops and disconnects a scene.restart-style second call, never leaving both running', () => {
    // Simulates create() calling setBgm() again on scene reuse (a zone warp): the first
    // oscillator must be torn down before a second one is assigned to the same handle.
    const first = fakeOsc()
    let bgmOsc = first
    bgmOsc = stopBgm(bgmOsc)
    expect(first.calls).toEqual(['stop', 'disconnect'])
    expect(bgmOsc).toBeNull()
    bgmOsc = fakeOsc() // the new oscillator setBgm() would start
    expect(bgmOsc).not.toBe(first)
  })
})
