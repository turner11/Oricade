import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { createWorld, createPlayerBody } from '../physics.js'
import {
  POINTS_TO_WIN,
  POINTS_PER_BASKET,
  HOOP_POSITION,
  HOOP_RADIUS,
  THROW_RADIUS,
  BALL_COLOR,
  checkBasketballOutcome,
  hudStatus,
  isBasket,
  shouldThrow,
  computeArcVelocity,
  createRuntime,
} from './basketball.js'

describe('checkBasketballOutcome', () => {
  it('returns "win" once points reach POINTS_TO_WIN', () => {
    expect(checkBasketballOutcome({ points: POINTS_TO_WIN, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBe('win')
  })

  it('returns "fail" when the player falls off, regardless of points', () => {
    expect(checkBasketballOutcome({ points: 4, playerPosition: { x: 0, y: -10, z: 0 } })).toBe('fail')
  })

  it('returns null while there is progress left to make and the player is safe', () => {
    expect(checkBasketballOutcome({ points: 4, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBeNull()
  })
})

describe('isBasket', () => {
  it('is true when the ball is within HOOP_RADIUS of the hoop', () => {
    const ball = { x: HOOP_POSITION.x, y: HOOP_POSITION.y, z: HOOP_POSITION.z + HOOP_RADIUS / 2 }
    expect(isBasket(ball, HOOP_POSITION)).toBe(true)
  })

  it('is false when the ball is far from the hoop', () => {
    const ball = { x: 0, y: 0.3, z: 0 }
    expect(isBasket(ball, HOOP_POSITION)).toBe(false)
  })
})

describe('shouldThrow', () => {
  it('is true when the player is within THROW_RADIUS of the ball and shoot is pressed', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: THROW_RADIUS / 2, y: 0.3, z: 0 }
    expect(shouldThrow(player, ball, true)).toBe(true)
  })

  it('is false when shoot is not pressed', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: THROW_RADIUS / 2, y: 0.3, z: 0 }
    expect(shouldThrow(player, ball, false)).toBe(false)
  })

  it('is false when the ball is out of reach', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: THROW_RADIUS + 5, y: 0.3, z: 0 }
    expect(shouldThrow(player, ball, true)).toBe(false)
  })
})

describe('computeArcVelocity', () => {
  it('produces a launch velocity that lands exactly on the target after the given time', () => {
    const from = { x: 0, y: 0, z: 0 }
    const to = { x: 10, y: 0, z: 0 }
    const gravity = -10
    const time = 2
    const v = computeArcVelocity(from, to, gravity, time)

    // simulate simple projectile motion with the returned velocity
    const landing = {
      x: from.x + v.x * time,
      y: from.y + v.y * time + 0.5 * gravity * time * time,
      z: from.z + v.z * time,
    }
    expect(landing.x).toBeCloseTo(to.x)
    expect(landing.y).toBeCloseTo(to.y)
    expect(landing.z).toBeCloseTo(to.z)
  })
})

describe('hudStatus', () => {
  it('shows live points progress for the arcade HUD', () => {
    expect(hudStatus({ points: 4 })).toBe(`🏀 4/${POINTS_TO_WIN} POINTS`)
  })
})

describe('createRuntime scenery', () => {
  it('mounts the hoop on a backboard and pole like a real basketball hoop', () => {
    const scene = new THREE.Scene()
    createRuntime({ scene, world: createWorld(), playerBody: createPlayerBody() })

    const stand = scene.getObjectByName('hoop-stand')
    expect(stand).toBeDefined()
    expect(stand.getObjectByName('backboard')).toBeDefined()
    expect(stand.getObjectByName('pole')).toBeDefined()
  })

  it('uses an orange basketball', () => {
    const scene = new THREE.Scene()
    createRuntime({ scene, world: createWorld(), playerBody: createPlayerBody() })

    expect(BALL_COLOR).toBe(0xff8c42)
    expect(scene.getObjectByName('ball').material.color.getHex()).toBe(BALL_COLOR)
  })
})
