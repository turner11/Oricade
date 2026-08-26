import { describe, it, expect } from 'vitest'
import { TILE, ZONES, isSolid, zoneSize } from './zone.js'
import { facingFrom } from './zone.js'
import { ATTACK_REACH, IFRAME_MS, ATTACK_MS, SIGHT_RANGE, DASH_SPEED } from './game-config.js'
import {
  attackRect,
  takeHit,
  hasLineOfSight,
  heartString,
  ENEMY,
  ZONE_ENEMIES,
  spreadAngles,
  dashVelocity,
  DASH,
  CHARGED_ATTACK,
} from './combat.js'

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

  it('a charged swing has a larger hitbox at the same offset', () => {
    const x = 100
    const y = 100
    const normal = attackRect(x, y, 'right')
    const charged = attackRect(x, y, 'right', 1.8)

    expect(charged.x).toBe(normal.x)
    expect(charged.y).toBe(normal.y)
    expect(charged.width).toBeGreaterThan(normal.width)
    expect(charged.height).toBeGreaterThan(normal.height)
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

  it('a charged hit drains two HP, the default drains one', () => {
    const charged = takeHit({ hp: 5, invincibleUntil: 0 }, 0, IFRAME_MS, 2)
    expect(charged.hp).toBe(3)
    expect(charged.invincibleUntil).toBe(IFRAME_MS)

    const normal = takeHit({ hp: 5, invincibleUntil: 0 }, 0, IFRAME_MS)
    expect(normal.hp).toBe(4)
    expect(normal.invincibleUntil).toBe(IFRAME_MS)
  })
})

describe('hasLineOfSight', () => {
  it('is blocked by solid tiles and capped by range, reading the given zone', () => {
    // Zone 0 internal wall sits at row 6, cols 10-14. Pick points either side of it.
    const above = { x: 12 * TILE + TILE / 2, y: 4 * TILE + TILE / 2 }
    const below = { x: 12 * TILE + TILE / 2, y: 8 * TILE + TILE / 2 }
    expect(hasLineOfSight(0, above, below, SIGHT_RANGE)).toBe(false)

    const a = { x: 2 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }
    const b = { x: 4 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }
    expect(hasLineOfSight(0, a, b, SIGHT_RANGE)).toBe(true)

    const far = { x: 30 * TILE + TILE / 2, y: 2 * TILE + TILE / 2 }
    expect(hasLineOfSight(0, a, far, SIGHT_RANGE)).toBe(false)

    // Zone 1's pond sits at rows 14-16, cols 20-24 — a wall the zone-0 case above can't prove
    // is being read from the right grid.
    const pondAbove = { x: 22 * TILE + TILE / 2, y: 13 * TILE + TILE / 2 }
    const pondBelow = { x: 22 * TILE + TILE / 2, y: 17 * TILE + TILE / 2 }
    expect(hasLineOfSight(1, pondAbove, pondBelow, SIGHT_RANGE)).toBe(false)
  })
})

describe('ENEMY', () => {
  const KINDS = ['zane', 'ash', 'stormy', 'whisper', 'ember', 'gale']

  it('has all six v1 kinds', () => {
    for (const kind of KINDS) expect(ENEMY[kind]).toBeTruthy()
  })

  it('ash is a faster zane reskin', () => {
    expect(ENEMY.ash.speed).toBeGreaterThan(ENEMY.zane.speed)
    expect(ENEMY.ash.dashSpeed).toBeGreaterThan(ENEMY.zane.dashSpeed)
    expect(ENEMY.ash.color).not.toBe(ENEMY.zane.color)
  })

  it('gates ash and whisper to night', () => {
    expect(ENEMY.ash.phase).toBe('night')
    expect(ENEMY.whisper.phase).toBe('night')
  })

  it('stormy fires one projectile, whisper fires two', () => {
    expect(ENEMY.stormy.projectiles).toBe(1)
    expect(ENEMY.whisper.projectiles).toBe(2)
  })

  it('gale deals no contact damage but is the fastest thing in the roster', () => {
    expect(ENEMY.gale.contactDamage).toBe(0)
    expect(ENEMY.gale.speed).toBeGreaterThan(ENEMY.ash.speed)
    expect(ENEMY.gale.speed).toBeGreaterThan(ENEMY.ash.dashSpeed)
  })

  it('stationary kinds carry no patrol-driving speed', () => {
    expect(ENEMY.ember.speed).toBeUndefined()
    expect(ENEMY.stormy.speed).toBeUndefined()
    expect(ENEMY.whisper.speed).toBeUndefined()
  })

  it('bosses > exactly two boss defs, each recombining two existing behaviors', () => {
    const KNOWN_BEHAVIORS = ['chaser', 'caster', 'guard', 'erratic']
    const bosses = Object.values(ENEMY).filter((def) => def.unlocks)

    expect(bosses.length).toBe(2)
    for (const def of bosses) {
      expect(Array.isArray(def.behavior)).toBe(true)
      expect(def.behavior.length).toBe(2)
      for (const b of def.behavior) expect(KNOWN_BEHAVIORS).toContain(b)
    }

    const unlocks = bosses.map((def) => def.unlocks)
    expect(new Set(unlocks).size).toBe(2)
    expect(unlocks).toEqual(expect.arrayContaining([DASH, CHARGED_ATTACK]))
  })
})

describe('ZONE_ENEMIES', () => {
  it('has one placement list per zone', () => {
    expect(ZONE_ENEMIES.length).toBe(ZONES.length)
  })

  it('every placement (and patrol waypoint) sits on a walkable tile inside its own zone', () => {
    ZONE_ENEMIES.forEach((placements, z) => {
      const { width, height } = zoneSize(z)
      for (const placement of placements) {
        const points = [placement.at, ...(placement.patrol ?? [])]
        for (const p of points) {
          const x = p.col !== undefined ? p.col * TILE + TILE / 2 : p.x
          const y = p.row !== undefined ? p.row * TILE + TILE / 2 : p.y
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThan(width)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThan(height)

          const col = Math.floor(x / TILE)
          const row = Math.floor(y / TILE)
          expect(isSolid(ZONES[z][row][col])).toBe(false)
        }
      }
    })
  })

  it('places exactly the six v1 kinds plus the two bosses across the three zones', () => {
    const kinds = new Set(ZONE_ENEMIES.flat().map((p) => p.kind))
    expect(kinds).toEqual(
      new Set(['zane', 'ash', 'stormy', 'whisper', 'ember', 'gale', 'tempest', 'torrent'])
    )
  })

  it('every zone with a forward warp has exactly one boss, and the last zone has none', () => {
    ZONE_ENEMIES.forEach((placements, z) => {
      const hasForwardWarp = ZONES[z].some((row) => row.includes('E'))
      const bosses = placements.filter((p) => ENEMY[p.kind].unlocks)
      expect(bosses.length).toBe(hasForwardWarp ? 1 : 0)
    })
  })

  it('a boss that chases carries patrol waypoints', () => {
    ZONE_ENEMIES.flat().forEach((placement) => {
      const behaviors = [ENEMY[placement.kind].behavior].flat()
      if (behaviors.includes('chaser')) {
        expect(placement.patrol?.length).toBeGreaterThan(0)
      }
    })
  })

  it('places ember orthogonally adjacent to its zone door', () => {
    ZONE_ENEMIES.forEach((placements, z) => {
      const ember = placements.find((p) => p.kind === 'ember')
      if (!ember) return

      const zone = ZONES[z]
      const doorRow = zone.findIndex((r) => r.includes('D'))
      const doorCol = zone[doorRow].indexOf('D')

      const dist = Math.abs(ember.at.row - doorRow) + Math.abs(ember.at.col - doorCol)
      expect(dist).toBe(1)
    })
  })
})

describe('spreadAngles', () => {
  it('returns a single angle unchanged when count is 1', () => {
    expect(spreadAngles(0.5, 1, 0.4)).toEqual([0.5])
  })

  it('returns count angles centred on and symmetric about the given angle', () => {
    const [a, b] = spreadAngles(1, 2, 0.6)
    expect(a).toBeCloseTo(1 - 0.3)
    expect(b).toBeCloseTo(1 + 0.3)
    expect(b - a).toBeCloseTo(0.6)
  })
})

describe('dashVelocity', () => {
  it('points along the facing direction at the requested speed', () => {
    expect(dashVelocity('right', DASH_SPEED)).toEqual({ x: DASH_SPEED, y: 0 })
    expect(dashVelocity('left', DASH_SPEED)).toEqual({ x: -DASH_SPEED, y: 0 })
    expect(dashVelocity('down', DASH_SPEED)).toEqual({ x: 0, y: DASH_SPEED })
    expect(dashVelocity('up', DASH_SPEED)).toEqual({ x: 0, y: -DASH_SPEED })
    expect(dashVelocity('sideways', DASH_SPEED)).toEqual({ x: 0, y: DASH_SPEED })
  })
})

describe('heartString', () => {
  it('reflects current HP', () => {
    expect(heartString(3, 3)).toBe('♥♥♥')
    expect(heartString(1, 3)).toBe('♥♡♡')
    expect(heartString(0, 3)).toBe('♡♡♡')
  })
})
