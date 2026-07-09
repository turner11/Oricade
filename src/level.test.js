import { describe, it, expect } from 'vitest'
import { WIN_RADIUS, FAIL_Y, checkLevelOutcome, hasFallenOff } from './level.js'

const marker = { x: 10, y: 0.5, z: 0 }

describe('hasFallenOff', () => {
  it('is true once the player drops below FAIL_Y', () => {
    expect(hasFallenOff({ x: 0, y: FAIL_Y - 1, z: 0 })).toBe(true)
  })

  it('is false while the player is above FAIL_Y', () => {
    expect(hasFallenOff({ x: 0, y: 0.9, z: 0 })).toBe(false)
  })
})

describe('checkLevelOutcome', () => {
  it('returns "win" when the player is within WIN_RADIUS of the given marker', () => {
    const playerPosition = { x: marker.x + WIN_RADIUS / 2, y: 0.9, z: marker.z }
    expect(checkLevelOutcome(playerPosition, marker)).toBe('win')
  })

  it('returns "fail" when the player falls below FAIL_Y', () => {
    const playerPosition = { x: 0, y: FAIL_Y - 1, z: 0 }
    expect(checkLevelOutcome(playerPosition, marker)).toBe('fail')
  })

  it('returns null when neither condition is met', () => {
    const playerPosition = { x: 0, y: 0.9, z: 0 }
    expect(checkLevelOutcome(playerPosition, marker)).toBeNull()
  })
})
