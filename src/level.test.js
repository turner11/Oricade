import { describe, it, expect } from 'vitest'
import { MARKER_POSITION, WIN_RADIUS, FAIL_Y, checkLevelOutcome } from './level.js'

describe('checkLevelOutcome', () => {
  it('returns "win" when the player is within WIN_RADIUS of the marker', () => {
    const playerPosition = { x: MARKER_POSITION.x + WIN_RADIUS / 2, y: 0.9, z: MARKER_POSITION.z }
    expect(checkLevelOutcome(playerPosition, MARKER_POSITION)).toBe('win')
  })

  it('returns "fail" when the player falls below FAIL_Y', () => {
    const playerPosition = { x: 0, y: FAIL_Y - 1, z: 0 }
    expect(checkLevelOutcome(playerPosition, MARKER_POSITION)).toBe('fail')
  })

  it('returns null when neither condition is met', () => {
    const playerPosition = { x: 0, y: 0.9, z: 0 }
    expect(checkLevelOutcome(playerPosition, MARKER_POSITION)).toBeNull()
  })
})
