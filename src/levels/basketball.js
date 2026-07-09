import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { hasFallenOff } from '../level.js'
import { GRAVITY } from '../physics.js'

export const POINTS_TO_WIN = 10
export const POINTS_PER_BASKET = 2
export const HOOP_POSITION = { x: 18, y: 3, z: 0 }
export const HOOP_RADIUS = 0.6
export const BALL_SPAWN = { x: 5, y: 0.3, z: 0 }
export const THROW_RADIUS = 1.5
export const THROW_TIME = 1.1

export function checkBasketballOutcome({ points, playerPosition }) {
  if (points >= POINTS_TO_WIN) return 'win'
  if (hasFallenOff(playerPosition)) return 'fail'
  return null
}

function distance3D(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function isBasket(ballPosition, hoopPosition) {
  return distance3D(ballPosition, hoopPosition) < HOOP_RADIUS
}

function distanceXZ(a, b) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function shouldThrow(playerPosition, ballPosition, shootPressed) {
  return shootPressed && distanceXZ(playerPosition, ballPosition) <= THROW_RADIUS
}

export function computeArcVelocity(from, to, gravity, time) {
  return {
    x: (to.x - from.x) / time,
    z: (to.z - from.z) / time,
    y: (to.y - from.y - 0.5 * gravity * time * time) / time,
  }
}

export function createRuntime({ scene, world, playerBody }) {
  let points = 0

  const ballBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3) })
  world.addBody(ballBody)

  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xff8800 }))
  scene.add(ballMesh)

  const hoopMesh = new THREE.Mesh(
    new THREE.TorusGeometry(HOOP_RADIUS, 0.05, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xff4400 }),
  )
  hoopMesh.position.set(HOOP_POSITION.x, HOOP_POSITION.y, HOOP_POSITION.z)
  hoopMesh.rotation.x = Math.PI / 2
  scene.add(hoopMesh)

  function resetBall() {
    ballBody.position.set(BALL_SPAWN.x, BALL_SPAWN.y, BALL_SPAWN.z)
    ballBody.velocity.set(0, 0, 0)
    ballBody.angularVelocity.set(0, 0, 0)
  }
  resetBall()

  return {
    update(inputP1) {
      ballMesh.position.copy(ballBody.position)
      ballMesh.quaternion.copy(ballBody.quaternion)

      if (shouldThrow(playerBody.position, ballBody.position, inputP1.shoot)) {
        const v = computeArcVelocity(ballBody.position, HOOP_POSITION, GRAVITY, THROW_TIME)
        ballBody.velocity.set(v.x, v.y, v.z)
      }

      if (isBasket(ballBody.position, HOOP_POSITION)) {
        points += POINTS_PER_BASKET
        resetBall()
      }
    },
    checkOutcome() {
      return checkBasketballOutcome({ points, playerPosition: playerBody.position })
    },
    reset() {
      points = 0
      resetBall()
    },
  }
}
