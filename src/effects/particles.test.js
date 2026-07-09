import { describe, it, expect } from 'vitest'
import { stepParticle, isExpired } from './particles.js'

describe('stepParticle', () => {
  it('advances position by velocity * dt and decrements life', () => {
    const particle = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 1, y: 2, z: -1 }, life: 1 }
    const next = stepParticle(particle, 0.5)
    expect(next.position).toEqual({ x: 0.5, y: 1, z: -0.5 })
    expect(next.life).toBeCloseTo(0.5)
  })

  it('does not mutate the input particle', () => {
    const particle = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 1, y: 0, z: 0 }, life: 1 }
    stepParticle(particle, 0.5)
    expect(particle.position).toEqual({ x: 0, y: 0, z: 0 })
    expect(particle.life).toBe(1)
  })
})

describe('isExpired', () => {
  it('is true once life reaches zero or below', () => {
    expect(isExpired({ life: 0 })).toBe(true)
    expect(isExpired({ life: -0.1 })).toBe(true)
  })

  it('is false while life remains', () => {
    expect(isExpired({ life: 0.1 })).toBe(false)
  })
})
