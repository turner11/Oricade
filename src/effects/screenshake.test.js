import { describe, it, expect } from 'vitest'
import { SHAKE_DURATION, SHAKE_INTENSITY, computeShakeOffset } from './screenshake.js'

describe('computeShakeOffset', () => {
  it('is zero once elapsed reaches the duration', () => {
    expect(computeShakeOffset(SHAKE_DURATION, SHAKE_DURATION, SHAKE_INTENSITY)).toEqual({ x: 0, y: 0, z: 0 })
    expect(computeShakeOffset(SHAKE_DURATION + 1, SHAKE_DURATION, SHAKE_INTENSITY)).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('has non-zero magnitude near the start of the shake', () => {
    const offset = computeShakeOffset(0.01, SHAKE_DURATION, SHAKE_INTENSITY)
    const magnitude = Math.sqrt(offset.x ** 2 + offset.y ** 2)
    expect(magnitude).toBeGreaterThan(0)
  })

  it('decays over time (later offset magnitude is smaller than an earlier one)', () => {
    const early = computeShakeOffset(0.01, SHAKE_DURATION, SHAKE_INTENSITY)
    const late = computeShakeOffset(SHAKE_DURATION * 0.9, SHAKE_DURATION, SHAKE_INTENSITY)
    const earlyMag = Math.sqrt(early.x ** 2 + early.y ** 2)
    const lateMag = Math.sqrt(late.x ** 2 + late.y ** 2)
    expect(lateMag).toBeLessThan(earlyMag)
  })
})
