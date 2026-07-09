import { describe, it, expect } from 'vitest'
import { WAVE_COUNT, ENEMIES_PER_WAVE, SHOOT_RANGE, FIRE_COOLDOWN, checkSpaceFleetOutcome, isEnemyInRange, shouldFire } from './spacefleet.js'

describe('checkSpaceFleetOutcome', () => {
  it('returns "win" once all waves are destroyed', () => {
    expect(checkSpaceFleetOutcome({ wavesDestroyed: WAVE_COUNT, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBe('win')
  })

  it('returns "fail" when the player falls off, even mid-fight', () => {
    expect(checkSpaceFleetOutcome({ wavesDestroyed: 1, playerPosition: { x: 0, y: -10, z: 0 } })).toBe('fail')
  })

  it('returns null with waves remaining and the player safe', () => {
    expect(checkSpaceFleetOutcome({ wavesDestroyed: 1, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBeNull()
  })
})

describe('isEnemyInRange', () => {
  it('is true within SHOOT_RANGE', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const enemy = { x: SHOOT_RANGE - 1, y: 1, z: 0 }
    expect(isEnemyInRange(player, enemy)).toBe(true)
  })

  it('is false beyond SHOOT_RANGE', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const enemy = { x: SHOOT_RANGE + 5, y: 1, z: 0 }
    expect(isEnemyInRange(player, enemy)).toBe(false)
  })
})

describe('shouldFire', () => {
  it('is true when shoot is pressed and off cooldown', () => {
    expect(shouldFire(true, 0)).toBe(true)
  })

  it('is false while on cooldown', () => {
    expect(shouldFire(true, FIRE_COOLDOWN)).toBe(false)
  })

  it('is false when shoot is not pressed', () => {
    expect(shouldFire(false, 0)).toBe(false)
  })
})

describe('config', () => {
  it('matches SPEC.md: 3 waves', () => {
    expect(WAVE_COUNT).toBe(3)
  })

  it('has at least one enemy per wave', () => {
    expect(ENEMIES_PER_WAVE).toBeGreaterThan(0)
  })
})
