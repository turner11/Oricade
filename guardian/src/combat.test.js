import { describe, it, expect } from 'vitest'
import { TILE, ZONE, isSolid, zoneSize } from './zone.js'
import { facingFrom } from './zone.js'
import { ATTACK_REACH, IFRAME_MS, ATTACK_MS, SIGHT_RANGE } from './game-config.js'
import { attackRect, takeHit, hasLineOfSight, ZANE_PATROL, heartString } from './combat.js'

describe('attackRect', () => {
  it('places the hitbox in front of the facing direction', () => {
    const x = 100
    const y = 100

    const right = attackRect(x, y, 'right')
    expect(right.x).toBe(x + ATTACK_REACH)
    expect(right.y).toBe(y)

    const left = attackRect(x, y, 'left')
    expect(left.x).toBe(x - ATTACK_REACH)
    expect(left.y).toBe(y)

    const down = attackRect(x, y, 'down')
    expect(down.x).toBe(x)
    expect(down.y).toBe(y + ATTACK_REACH)

    const up = attackRect(x, y, 'up')
    expect(up.x).toBe(x)
    expect(up.y).toBe(y - ATTACK_REACH)

    expect(facingFrom(1, 0)).toBe('right')
  })
})

describe('takeHit', () => {
  it('drains one HP and then ignores hits during invincibility frames', () => {
    let state = { hp: 3, invincibleUntil: 0 }

    state = takeHit(state, 0, IFRAME_MS)
    expect(state.hp).toBe(2)
    expect(state.invincibleUntil).toBe(IFRAME_MS)

    state = takeHit(state, 500, IFRAME_MS)
    expect(state.hp).toBe(2)

    state = takeHit(state, 1100, IFRAME_MS)
    expect(state.hp).toBe(1)
  })

  it('clamps HP at zero', () => {
    let state = { hp: 1, invincibleUntil: 0 }
    state = takeHit(state, 0, IFRAME_MS)
    expect(state.hp).toBe(0)

    state = takeHit(state, IFRAME_MS + 1, IFRAME_MS)
    expect(state.hp).toBe(0)
  })

  it('gates the enemy to one hit per swing', () => {
    let state = { hp: 3, invincibleUntil: 0 }
    let now = 0
    for (let i = 0; i < 10; i++) {
      state = takeHit(state, now, ATTACK_MS)
      now += 16
    }
    expect(state.hp).toBe(2)
  })
})

describe('hasLineOfSight', () => {
  it('is blocked by solid tiles and capped by range', () => {
    // Internal wall sits at ZONE row 6, cols 10-14. Pick points either side of it.
    const above = { x: 12 * TILE + TILE / 2, y: 4 * TILE + TILE / 2 }
    const below = { x: 12 * TILE + TILE / 2, y: 8 * TILE + TILE / 2 }
    expect(hasLineOfSight(above, below, SIGHT_RANGE)).toBe(false)

    const a = { x: 2 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }
    const b = { x: 4 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }
    expect(hasLineOfSight(a, b, SIGHT_RANGE)).toBe(true)

    const far = { x: 30 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }
    expect(hasLineOfSight(a, far, SIGHT_RANGE)).toBe(false)
  })
})

describe('ZANE_PATROL', () => {
  it('waypoints are walkable and inside the zone', () => {
    const { width, height } = zoneSize()
    expect(ZANE_PATROL.length).toBeGreaterThanOrEqual(2)

    for (const point of ZANE_PATROL) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThan(width)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThan(height)

      const col = Math.floor(point.x / TILE)
      const row = Math.floor(point.y / TILE)
      expect(isSolid(ZONE[row][col])).toBe(false)
    }
  })
})

describe('heartString', () => {
  it('reflects current HP', () => {
    expect(heartString(3, 3)).toBe('♥♥♥')
    expect(heartString(1, 3)).toBe('♥♡♡')
    expect(heartString(0, 3)).toBe('♡♡♡')
  })
})
