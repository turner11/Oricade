import { describe, it, expect } from 'vitest'
import {
  GEM_POSITIONS,
  GEM_RADIUS,
  DASH_COOLDOWN,
  DASH_SPEED_MULTIPLIER,
  checkUnicornOutcome,
  isNearGem,
  shouldDash,
} from './unicorn.js'

describe('checkUnicornOutcome', () => {
  it('returns "win" once all gems are collected', () => {
    const state = { gemsCollected: GEM_POSITIONS.length, totalGems: GEM_POSITIONS.length, playerPosition: { x: 0, y: 0.9, z: 0 } }
    expect(checkUnicornOutcome(state)).toBe('win')
  })

  it('returns "fail" when the player falls off, regardless of gems collected', () => {
    const state = { gemsCollected: 2, totalGems: GEM_POSITIONS.length, playerPosition: { x: 0, y: -10, z: 0 } }
    expect(checkUnicornOutcome(state)).toBe('fail')
  })

  it('returns null while gems remain and the player is safe', () => {
    const state = { gemsCollected: 2, totalGems: GEM_POSITIONS.length, playerPosition: { x: 0, y: 0.9, z: 0 } }
    expect(checkUnicornOutcome(state)).toBeNull()
  })
})

describe('isNearGem', () => {
  const gem = GEM_POSITIONS[0]

  it('is true within GEM_RADIUS of the gem', () => {
    const player = { x: gem.x, y: gem.y, z: gem.z + GEM_RADIUS / 2 }
    expect(isNearGem(player, gem)).toBe(true)
  })

  it('is false far from the gem', () => {
    expect(isNearGem({ x: gem.x + 50, y: gem.y, z: gem.z }, gem)).toBe(false)
  })
})

describe('shouldDash', () => {
  it('is true when magic is pressed and off cooldown', () => {
    expect(shouldDash(true, 0)).toBe(true)
  })

  it('is false while on cooldown', () => {
    expect(shouldDash(true, DASH_COOLDOWN)).toBe(false)
  })

  it('is false when magic is not pressed', () => {
    expect(shouldDash(false, 0)).toBe(false)
  })
})

describe('config', () => {
  it('collecting requires exactly 5 gems per SPEC.md', () => {
    expect(GEM_POSITIONS.length).toBe(5)
  })

  it('dash is a genuine speed boost, not a no-op', () => {
    expect(DASH_SPEED_MULTIPLIER).toBeGreaterThan(1)
  })
})
