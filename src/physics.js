import * as CANNON from 'cannon-es'

export const CHARACTER = { height: 1.8, width: 0.6, mass: 75 }
export const GRAVITY = -9.8
export const MOVE_SPEED = 4
export const JUMP_SPEED = 5

export function computeVelocity(moveInput, crouch, currentVerticalVelocity) {
  const speed = crouch ? MOVE_SPEED / 2 : MOVE_SPEED
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
  return world
}

export function createGroundBody() {
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  return ground
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
