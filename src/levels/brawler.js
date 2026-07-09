import * as THREE from 'three'
import { hasFallenOff } from '../level.js'

export const OPPONENT_POSITION = { x: 8, y: 0.9, z: 0 }
export const OPPONENT_MAX_HEALTH = 100
export const DAMAGE_PER_HIT = 25
export const ATTACK_RADIUS = 1.5
export const ATTACK_COOLDOWN = 0.5

export function checkBrawlerOutcome({ opponentHealth, playerPosition }) {
  if (opponentHealth <= 0) return 'win'
  if (hasFallenOff(playerPosition)) return 'fail'
  return null
}

function distanceXZ(a, b) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function shouldAttack(playerPosition, opponentPosition, attackPressed, cooldownRemaining) {
  return attackPressed && cooldownRemaining <= 0 && distanceXZ(playerPosition, opponentPosition) <= ATTACK_RADIUS
}

export function createRuntime({ scene, playerBody }) {
  let opponentHealth = OPPONENT_MAX_HEALTH
  let cooldownRemaining = 0

  const opponentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, 0.6), new THREE.MeshStandardMaterial({ color: 0xcc2244 }))
  opponentMesh.position.set(OPPONENT_POSITION.x, OPPONENT_POSITION.y, OPPONENT_POSITION.z)
  scene.add(opponentMesh)

  const healthBarBack = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({ color: 0x333333 }))
  const healthBarFront = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.15), new THREE.MeshBasicMaterial({ color: 0x22cc44 }))
  healthBarBack.position.set(OPPONENT_POSITION.x, OPPONENT_POSITION.y + 1.4, OPPONENT_POSITION.z)
  healthBarFront.position.set(OPPONENT_POSITION.x, OPPONENT_POSITION.y + 1.4, OPPONENT_POSITION.z + 0.01)
  scene.add(healthBarBack, healthBarFront)

  function updateHealthBar() {
    const fraction = Math.max(0, opponentHealth / OPPONENT_MAX_HEALTH)
    healthBarFront.scale.x = fraction
    healthBarFront.position.x = OPPONENT_POSITION.x - (1.5 * (1 - fraction)) / 2
  }

  return {
    update(inputP1, dt) {
      cooldownRemaining = Math.max(0, cooldownRemaining - dt)

      if (opponentHealth > 0 && shouldAttack(playerBody.position, OPPONENT_POSITION, inputP1.shoot, cooldownRemaining)) {
        opponentHealth = Math.max(0, opponentHealth - DAMAGE_PER_HIT)
        cooldownRemaining = ATTACK_COOLDOWN
        updateHealthBar()
      }
    },
    checkOutcome() {
      return checkBrawlerOutcome({ opponentHealth, playerPosition: playerBody.position })
    },
    reset() {
      opponentHealth = OPPONENT_MAX_HEALTH
      cooldownRemaining = 0
      updateHealthBar()
    },
  }
}
