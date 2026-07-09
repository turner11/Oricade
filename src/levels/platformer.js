import * as THREE from 'three'
import { checkLevelOutcome } from '../level.js'
import { PALETTE } from '../theme.js'
import { spawnBurst } from '../effects/particles.js'
import { audio } from '../audio.js'

export const FLAG_POSITION = { x: 20, y: 0.5, z: 0 }
export const HAZARD_RADIUS = 0.6
export const JUMP_CLEAR_HEIGHT = 1.3

export const HAZARDS = [
  { x: 6, z: 0, type: 'jump' },
  { x: 13, z: 0, type: 'duck' },
]

function isNearHazard(playerPosition, hazard) {
  const dx = playerPosition.x - hazard.x
  const dz = playerPosition.z - hazard.z
  return Math.sqrt(dx * dx + dz * dz) < HAZARD_RADIUS
}

export function isTouchingHazard(playerPosition, crouching, hazards) {
  return hazards.some((hazard) => {
    if (!isNearHazard(playerPosition, hazard)) return false
    if (hazard.type === 'jump') return playerPosition.y < JUMP_CLEAR_HEIGHT
    if (hazard.type === 'duck') return !crouching
    return false
  })
}

export function checkPlatformerOutcome(playerPosition, crouching, flagPosition, hazards) {
  if (isTouchingHazard(playerPosition, crouching, hazards)) return 'fail'
  return checkLevelOutcome(playerPosition, flagPosition)
}

export function createRuntime({ scene, playerBody }) {
  const flagMesh = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2), new THREE.MeshStandardMaterial({ color: PALETTE.neutralLight }))
  pole.position.y = 1
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: PALETTE.accentGreen }))
  flag.position.set(0.3, 1.7, 0)
  flagMesh.add(pole, flag)
  flagMesh.position.set(FLAG_POSITION.x, 0, FLAG_POSITION.z)
  scene.add(flagMesh)

  for (const hazard of HAZARDS) {
    const isJump = hazard.type === 'jump'
    const mesh = new THREE.Mesh(
      isJump ? new THREE.ConeGeometry(HAZARD_RADIUS * 0.6, 1, 8) : new THREE.BoxGeometry(HAZARD_RADIUS * 1.6, 0.3, 1.5),
      new THREE.MeshStandardMaterial({ color: PALETTE.accentRed }),
    )
    mesh.position.set(hazard.x, isJump ? 0.5 : JUMP_CLEAR_HEIGHT, hazard.z)
    scene.add(mesh)
  }

  let crouching = false
  let wonBurstPlayed = false

  return {
    update(inputP1) {
      crouching = inputP1.crouch
      if (!wonBurstPlayed && checkPlatformerOutcome(playerBody.position, crouching, FLAG_POSITION, HAZARDS) === 'win') {
        wonBurstPlayed = true
        spawnBurst(scene, FLAG_POSITION, PALETTE.accentGreen)
        audio.playSfx(660, 0.2)
      }
    },
    checkOutcome() {
      return checkPlatformerOutcome(playerBody.position, crouching, FLAG_POSITION, HAZARDS)
    },
    reset() {
      crouching = false
      wonBurstPlayed = false
    },
  }
}
