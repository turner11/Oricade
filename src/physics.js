import * as CANNON from 'cannon-es'

export const CHARACTER = { height: 1.8, width: 0.6, mass: 75 }
export const GRAVITY = -9.8
export const MOVE_SPEED = 4
export const JUMP_SPEED = 5

export function computeVelocity(moveInput, crouch, currentVerticalVelocity, speedMultiplier = 1) {
  const speed = (crouch ? MOVE_SPEED / 2 : MOVE_SPEED) * speedMultiplier
  return {
    x: moveInput.x * speed,
    y: currentVerticalVelocity,
    z: moveInput.y * -speed || 0,
  }
}

export function jumpVelocity(grounded, jumpPressed) {
  return grounded && jumpPressed ? JUMP_SPEED : null
}

export function createWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) })
  // Movement is driven by directly setting velocity (see PlayerController), not forces —
  // default contact friction fights that and kills horizontal movement almost entirely.
  world.defaultContactMaterial.friction = 0
  return world
}

export const GROUND_SIZE = 50

export function createGroundBody() {
  const half = GROUND_SIZE / 2
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(half, 0.5, half)) })
  ground.position.set(0, -0.5, 0)
  return ground
}

// Issue #32: objects (ball, players) must never fall off the arena edge.
export function createArenaWallBodies() {
  const half = GROUND_SIZE / 2
  const wallHeight = 5
  return [
    { position: [half, 0, 0], halfExtents: [0.5, wallHeight, half] },
    { position: [-half, 0, 0], halfExtents: [0.5, wallHeight, half] },
    { position: [0, 0, half], halfExtents: [half, wallHeight, 0.5] },
    { position: [0, 0, -half], halfExtents: [half, wallHeight, 0.5] },
  ].map(({ position, halfExtents }) => {
    const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(...halfExtents)) })
    wall.position.set(...position)
    return wall
  })
}

export function createPlayerBody() {
  const half = new CANNON.Vec3(CHARACTER.width / 2, CHARACTER.height / 2, CHARACTER.width / 2)
  const player = new CANNON.Body({
    mass: CHARACTER.mass,
    shape: new CANNON.Box(half),
    fixedRotation: true,
  })
  player.position.set(0, CHARACTER.height, 0)
  return player
}
