import { describe, it, expect } from 'vitest'
import { FLAG_POSITION, HAZARDS, HAZARD_RADIUS, JUMP_CLEAR_HEIGHT, isTouchingHazard, checkPlatformerOutcome } from './platformer.js'

const jumpHazard = HAZARDS.find((h) => h.type === 'jump')
const duckHazard = HAZARDS.find((h) => h.type === 'duck')

describe('isTouchingHazard', () => {
  it('is true when standing in a jump-hazard zone without jumping high enough', () => {
    const player = { x: jumpHazard.x, y: JUMP_CLEAR_HEIGHT - 0.5, z: jumpHazard.z }
    expect(isTouchingHazard(player, false, HAZARDS)).toBe(true)
  })

  it('is false when clearing a jump-hazard zone with enough height', () => {
    const player = { x: jumpHazard.x, y: JUMP_CLEAR_HEIGHT + 0.5, z: jumpHazard.z }
    expect(isTouchingHazard(player, false, HAZARDS)).toBe(false)
  })

  it('is true when walking through a duck-hazard zone without crouching', () => {
    const player = { x: duckHazard.x, y: 0.9, z: duckHazard.z }
    expect(isTouchingHazard(player, false, HAZARDS)).toBe(true)
  })

  it('is false when crouching through a duck-hazard zone', () => {
    const player = { x: duckHazard.x, y: 0.9, z: duckHazard.z }
    expect(isTouchingHazard(player, true, HAZARDS)).toBe(false)
  })

  it('is false when nowhere near a hazard', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    expect(isTouchingHazard(player, false, HAZARDS)).toBe(false)
  })
})

describe('checkPlatformerOutcome', () => {
  it('returns "fail" when touching a hazard, even near the flag', () => {
    const player = { x: jumpHazard.x, y: 0.9, z: jumpHazard.z }
    expect(checkPlatformerOutcome(player, false, FLAG_POSITION, HAZARDS)).toBe('fail')
  })

  it('returns "win" when safely reaching the flag', () => {
    const player = { x: FLAG_POSITION.x, y: 0.9, z: FLAG_POSITION.z }
    expect(checkPlatformerOutcome(player, false, FLAG_POSITION, HAZARDS)).toBe('win')
  })

  it('returns null mid-course with no hazard touched', () => {
    const player = { x: 1, y: 0.9, z: 0 }
    expect(checkPlatformerOutcome(player, false, FLAG_POSITION, HAZARDS)).toBeNull()
  })
})
