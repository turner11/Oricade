import * as THREE from 'three'
import { checkLevelOutcome } from '../level.js'
import { GRAVITY } from '../physics.js'
import { isTouchingHazard, HAZARD_RADIUS, JUMP_CLEAR_HEIGHT } from './platformer.js'

export const ARTIFACT_POSITION = { x: 18, y: 0.5, z: 0 }
export const TIME_SLOW_FACTOR = 0.3

export const HAZARDS = [
  { x: 5, z: 0, type: 'jump' },
  { x: 10, z: 0, type: 'duck' },
  { x: 14, z: 0, type: 'jump' },
]

export function checkTrapDungeonOutcome(playerPosition, crouching, artifactPosition, hazards) {
  if (isTouchingHazard(playerPosition, crouching, hazards)) return 'fail'
  return checkLevelOutcome(playerPosition, artifactPosition)
}

export function computeGravityCompensation(dt, gravity, factor) {
  return -gravity * dt * (1 - factor)
}

export function createRuntime({ scene, playerBody }) {
  const artifactMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0xffaa00 }))
  artifactMesh.position.set(ARTIFACT_POSITION.x, ARTIFACT_POSITION.y, ARTIFACT_POSITION.z)
  scene.add(artifactMesh)

  for (const hazard of HAZARDS) {
    const isJump = hazard.type === 'jump'
    const mesh = new THREE.Mesh(
      isJump ? new THREE.ConeGeometry(HAZARD_RADIUS * 0.6, 1, 8) : new THREE.BoxGeometry(HAZARD_RADIUS * 1.6, 0.3, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x662299 }),
    )
    mesh.position.set(hazard.x, isJump ? 0.5 : JUMP_CLEAR_HEIGHT, hazard.z)
    scene.add(mesh)
  }

  let crouching = false

  return {
    update(inputP1, dt) {
      crouching = inputP1.crouch
      if (inputP1.magic) {
        playerBody.velocity.y += computeGravityCompensation(dt, GRAVITY, TIME_SLOW_FACTOR)
      }
    },
    checkOutcome() {
      return checkTrapDungeonOutcome(playerBody.position, crouching, ARTIFACT_POSITION, HAZARDS)
    },
    reset() {
      crouching = false
    },
  }
}
