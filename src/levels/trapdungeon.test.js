import { describe, it, expect } from 'vitest'
import { HAZARD_RADIUS, JUMP_CLEAR_HEIGHT } from './platformer.js'
import { ARTIFACT_POSITION, HAZARDS, TIME_SLOW_FACTOR, checkTrapDungeonOutcome, computeGravityCompensation } from './trapdungeon.js'

const jumpHazard = HAZARDS.find((h) => h.type === 'jump')
const duckHazard = HAZARDS.find((h) => h.type === 'duck')

describe('checkTrapDungeonOutcome', () => {
  it('returns "fail" when touching a hazard, even near the artifact', () => {
    const player = { x: jumpHazard.x, y: 0.9, z: jumpHazard.z }
    expect(checkTrapDungeonOutcome(player, false, ARTIFACT_POSITION, HAZARDS)).toBe('fail')
  })

  it('returns "win" when safely reaching the artifact', () => {
    const player = { x: ARTIFACT_POSITION.x, y: 0.9, z: ARTIFACT_POSITION.z }
    expect(checkTrapDungeonOutcome(player, false, ARTIFACT_POSITION, HAZARDS)).toBe('win')
  })

  it('returns null mid-course with no hazard touched', () => {
    const player = { x: 1, y: 0.9, z: 0 }
    expect(checkTrapDungeonOutcome(player, false, ARTIFACT_POSITION, HAZARDS)).toBeNull()
  })

  it('clears the jump hazard the same way the Retro Platformer does', () => {
    const player = { x: jumpHazard.x, y: JUMP_CLEAR_HEIGHT + 0.1, z: jumpHazard.z }
    expect(checkTrapDungeonOutcome(player, false, ARTIFACT_POSITION, HAZARDS)).toBeNull()
  })

  it('clears the duck hazard while crouching', () => {
    const player = { x: duckHazard.x, y: 0.9, z: duckHazard.z }
    expect(checkTrapDungeonOutcome(player, true, ARTIFACT_POSITION, HAZARDS)).toBeNull()
  })
})

describe('computeGravityCompensation', () => {
  it('returns an upward velocity delta that scales gravity by TIME_SLOW_FACTOR', () => {
    const dt = 0.1
    const gravity = -9.8
    const delta = computeGravityCompensation(dt, gravity, TIME_SLOW_FACTOR)
    // net vertical acceleration this frame = gravity*dt (from world.step) + delta, should equal gravity*dt*factor
    expect(delta + gravity * dt).toBeCloseTo(gravity * dt * TIME_SLOW_FACTOR)
  })

  it('is a genuine slowdown, not a no-op', () => {
    expect(TIME_SLOW_FACTOR).toBeGreaterThan(0)
    expect(TIME_SLOW_FACTOR).toBeLessThan(1)
  })
})

describe('config', () => {
  it('reuses the Retro Platformer hazard tuning', () => {
    expect(HAZARD_RADIUS).toBeGreaterThan(0)
    expect(JUMP_CLEAR_HEIGHT).toBeGreaterThan(0)
  })
})
