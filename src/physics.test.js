import { describe, it, expect } from 'vitest'
import * as CANNON from 'cannon-es'
import {
  CHARACTER,
  GRAVITY,
  MOVE_SPEED,
  JUMP_SPEED,
  computeVelocity,
  jumpVelocity,
  createWorld,
  createGroundBody,
  createPlayerBody,
} from './physics.js'

describe('character config', () => {
  it('matches the SPEC.md standardized physics core', () => {
    expect(CHARACTER.height).toBe(1.8)
    expect(CHARACTER.width).toBe(0.6)
    expect(CHARACTER.mass).toBe(75)
    expect(GRAVITY).toBe(-9.8)
  })
})

describe('computeVelocity', () => {
  it('moves right at MOVE_SPEED and preserves vertical velocity', () => {
    expect(computeVelocity({ x: 1, y: 0 }, false, -3)).toEqual({ x: MOVE_SPEED, y: -3, z: 0 })
  })

  it('moves forward (positive move.y) toward -z', () => {
    expect(computeVelocity({ x: 0, y: 1 }, false, 0)).toEqual({ x: 0, y: 0, z: -MOVE_SPEED })
  })

  it('halves speed while crouching', () => {
    expect(computeVelocity({ x: 1, y: 0 }, true, 0)).toEqual({ x: MOVE_SPEED / 2, y: 0, z: 0 })
  })

  it('is zero when there is no input', () => {
    expect(computeVelocity({ x: 0, y: 0 }, false, 0)).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('jumpVelocity', () => {
  it('returns JUMP_SPEED when grounded and jump is pressed', () => {
    expect(jumpVelocity(true, true)).toBe(JUMP_SPEED)
  })

  it('returns null when airborne, even if jump is pressed', () => {
    expect(jumpVelocity(false, true)).toBeNull()
  })

  it('returns null when jump is not pressed', () => {
    expect(jumpVelocity(true, false)).toBeNull()
  })
})

describe('createWorld', () => {
  it('builds a CANNON.World with the standardized gravity', () => {
    const world = createWorld()
    expect(world).toBeInstanceOf(CANNON.World)
    expect(world.gravity.y).toBe(GRAVITY)
  })
})

describe('createGroundBody', () => {
  it('builds a static (mass 0) ground body', () => {
    const ground = createGroundBody()
    expect(ground).toBeInstanceOf(CANNON.Body)
    expect(ground.mass).toBe(0)
  })
})

describe('createPlayerBody', () => {
  it('builds a box body sized and massed per CHARACTER', () => {
    const player = createPlayerBody()
    expect(player).toBeInstanceOf(CANNON.Body)
    expect(player.mass).toBe(CHARACTER.mass)
    const box = player.shapes[0]
    expect(box.halfExtents.x).toBeCloseTo(CHARACTER.width / 2)
    expect(box.halfExtents.y).toBeCloseTo(CHARACTER.height / 2)
  })
})
