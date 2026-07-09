import * as THREE from 'three'
import { CHARACTER } from './physics.js'
import { PALETTE } from './theme.js'

// Low-poly humanoid sized to the physics bounding box (1.8m tall), centered on the
// origin so it can copy the physics body position directly, same as the old box mesh.
export function createCharacterMesh(color = PALETTE.player) {
  const group = new THREE.Group()
  const bodyMaterial = new THREE.MeshStandardMaterial({ color })
  const skinMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.accentGold })
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x222233 })

  const h = CHARACTER.height // 1.8: legs 0.6, body 0.7, head 0.5
  const bottom = -h / 2

  const legGeometry = new THREE.BoxGeometry(0.18, 0.6, 0.2)
  for (const [name, x] of [['legL', -0.14], ['legR', 0.14]]) {
    const leg = new THREE.Mesh(legGeometry, bodyMaterial)
    leg.name = name
    leg.position.set(x, bottom + 0.3, 0)
    group.add(leg)
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), bodyMaterial)
  body.name = 'body'
  body.position.y = bottom + 0.6 + 0.35
  group.add(body)

  const armGeometry = new THREE.BoxGeometry(0.12, 0.55, 0.15)
  for (const [name, x] of [['armL', -0.31], ['armR', 0.31]]) {
    const arm = new THREE.Mesh(armGeometry, bodyMaterial)
    arm.name = name
    arm.position.set(x, bottom + 0.6 + 0.35, 0)
    group.add(arm)
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.35), skinMaterial)
  head.name = 'head'
  head.position.y = bottom + 1.3 + 0.25
  group.add(head)

  const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8)
  for (const [name, x] of [['eyeL', -0.1], ['eyeR', 0.1]]) {
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    eye.name = name
    // eyes sit on the front (-z) face: the camera looks down -z, forward movement is -z
    eye.position.set(x, bottom + 1.3 + 0.28, -0.18)
    group.add(eye)
  }

  return group
}

const SWING_SPEED = 8
const SWING_AMPLITUDE = 0.6
const MOVING_THRESHOLD = 0.1

// Simple arcade walk cycle: opposite-phase limb swing while moving, at rest otherwise.
export function animateCharacter(character, speed, time) {
  const swing = speed > MOVING_THRESHOLD ? Math.sin(time * SWING_SPEED) * SWING_AMPLITUDE : 0
  character.getObjectByName('armL').rotation.x = swing
  character.getObjectByName('armR').rotation.x = -swing || 0
  character.getObjectByName('legL').rotation.x = -swing || 0
  character.getObjectByName('legR').rotation.x = swing
}

// Turn toward the travel direction; the model's face is on its local -z side.
export function faceMovement(character, vx, vz) {
  if (Math.hypot(vx, vz) < MOVING_THRESHOLD) return
  character.rotation.y = Math.atan2(-vx, -vz)
}
