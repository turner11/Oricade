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

// White posts, crossbar, and translucent net standing on the goal line.
function createGoalFrame() {
  const goal = new THREE.Group()
  goal.name = 'goal'
  const centerZ = (GOAL_ZONE.zMin + GOAL_ZONE.zMax) / 2
  const width = GOAL_ZONE.zMax - GOAL_ZONE.zMin
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff })

  const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2)
  for (const [name, z] of [
    ['post-left', GOAL_ZONE.zMin],
    ['post-right', GOAL_ZONE.zMax],
  ]) {
    const post = new THREE.Mesh(postGeometry, white)
    post.name = name
    post.position.set(0, 1, z - centerZ)
    goal.add(post)
  }

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, width), white)
  crossbar.name = 'crossbar'
  crossbar.rotation.x = Math.PI / 2
  crossbar.position.y = 2
  goal.add(crossbar)

  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  )
  net.name = 'net'
  net.rotation.y = Math.PI / 2
  net.position.set(0.8, 1, 0)
  goal.add(net)

  goal.position.set(GOAL_ZONE.xMin, 0, centerZ)
  return goal
}

export function createRuntime({ scene, world, playerBody }) {
  let goals = 0
  let timeRemaining = TIME_LIMIT

  const ballBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3) })
  world.addBody(ballBody)

  const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xffffff }))
  ballMesh.name = 'ball'
  scene.add(ballMesh)

  scene.add(createGoalFrame())

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
