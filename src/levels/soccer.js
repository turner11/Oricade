import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { PALETTE } from '../theme.js'
import { spawnBurst } from '../effects/particles.js'
import { triggerShake } from '../effects/screenshake.js'
import { audio } from '../audio.js'
import { formatTime } from '../hud.js'

export const TIME_LIMIT = 60
export const GOALS_TO_WIN = 3
export const GOAL_ZONE = { xMin: 20, zMin: -3, zMax: 3 }
export const KICK_RADIUS = 1.5
export const KICK_IMPULSE = 8
export const BALL_SPAWN = { x: 5, y: 0.3, z: 0 }

export function checkSoccerOutcome({ goals, timeRemaining }) {
  if (goals >= GOALS_TO_WIN) return 'win'
  if (timeRemaining <= 0) return 'fail'
  return null
}

export function hudStatus({ goals, timeRemaining }) {
  return `⚽ ${goals}/${GOALS_TO_WIN} GOALS · ${formatTime(timeRemaining)}`
}

export function isGoal(ballPosition, goalZone) {
  return ballPosition.x >= goalZone.xMin && ballPosition.z >= goalZone.zMin && ballPosition.z <= goalZone.zMax
}

function distanceXZ(a, b) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function shouldKick(playerPosition, ballPosition, shootPressed) {
  return shootPressed && distanceXZ(playerPosition, ballPosition) <= KICK_RADIUS
}

export function computeKickImpulse(playerPosition, ballPosition, force) {
  const dx = ballPosition.x - playerPosition.x
  const dz = ballPosition.z - playerPosition.z
  const dist = Math.sqrt(dx * dx + dz * dz) || 1
  return { x: (dx / dist) * force, y: 0, z: (dz / dist) * force }
}

export function createRuntime({ scene, world, playerBody }) {
  let goals = 0
  let timeRemaining = TIME_LIMIT

  const ballBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3) })
  world.addBody(ballBody)

  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }))
  scene.add(ballMesh)

  const goalMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, GOAL_ZONE.zMax - GOAL_ZONE.zMin),
    new THREE.MeshStandardMaterial({ color: PALETTE.accentGreen, transparent: true, opacity: 0.4 }),
  )
  goalMesh.position.set(GOAL_ZONE.xMin, 1, (GOAL_ZONE.zMin + GOAL_ZONE.zMax) / 2)
  scene.add(goalMesh)

  function resetBall() {
    ballBody.position.set(BALL_SPAWN.x, BALL_SPAWN.y, BALL_SPAWN.z)
    ballBody.velocity.set(0, 0, 0)
    ballBody.angularVelocity.set(0, 0, 0)
  }
  resetBall()

  return {
    update(inputP1, dt) {
      timeRemaining = Math.max(0, timeRemaining - dt)
      ballMesh.position.copy(ballBody.position)
      ballMesh.quaternion.copy(ballBody.quaternion)

      if (shouldKick(playerBody.position, ballBody.position, inputP1.shoot)) {
        const impulse = computeKickImpulse(playerBody.position, ballBody.position, KICK_IMPULSE)
        ballBody.velocity.set(impulse.x, ballBody.velocity.y, impulse.z)
      }

      if (isGoal(ballBody.position, GOAL_ZONE)) {
        goals += 1
        spawnBurst(scene, ballBody.position, PALETTE.accentGreen)
        audio.playSfx(523, 0.2)
        triggerShake()
        resetBall()
      }
    },
    getHudStatus() {
      return hudStatus({ goals, timeRemaining })
    },
    checkOutcome() {
      return checkSoccerOutcome({ goals, timeRemaining })
    },
    reset() {
      goals = 0
      timeRemaining = TIME_LIMIT
      resetBall()
    },
  }
}
