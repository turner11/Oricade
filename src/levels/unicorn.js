import * as THREE from 'three'
import { hasFallenOff } from '../level.js'
import { PALETTE } from '../theme.js'
import { spawnBurst } from '../effects/particles.js'
import { audio } from '../audio.js'

export const GEM_POSITIONS = [
  { x: 4, y: 1, z: 0 },
  { x: 8, y: 1, z: 2 },
  { x: 8, y: 1, z: -2 },
  { x: 12, y: 1, z: 0 },
  { x: 16, y: 1, z: 1 },
]
export const GEM_RADIUS = 1.0
export const DASH_SPEED_MULTIPLIER = 3
export const DASH_DURATION = 0.3
export const DASH_COOLDOWN = 1.0

export function checkUnicornOutcome({ gemsCollected, totalGems, playerPosition }) {
  if (gemsCollected >= totalGems) return 'win'
  if (hasFallenOff(playerPosition)) return 'fail'
  return null
}

function distance3D(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function isNearGem(playerPosition, gemPosition) {
  return distance3D(playerPosition, gemPosition) < GEM_RADIUS
}

export function shouldDash(magicPressed, cooldownRemaining) {
  return magicPressed && cooldownRemaining <= 0
}

export function createRuntime({ scene, playerBody }) {
  const gems = GEM_POSITIONS.map((position) => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: PALETTE.accentPink }))
    mesh.position.set(position.x, position.y, position.z)
    scene.add(mesh)
    return { position, mesh, collected: false }
  })

  let gemsCollected = 0
  let dashCooldownRemaining = 0
  let dashTimeRemaining = 0

  return {
    update(inputP1, dt) {
      dashCooldownRemaining = Math.max(0, dashCooldownRemaining - dt)
      dashTimeRemaining = Math.max(0, dashTimeRemaining - dt)

      if (shouldDash(inputP1.magic, dashCooldownRemaining)) {
        dashTimeRemaining = DASH_DURATION
        dashCooldownRemaining = DASH_COOLDOWN
        spawnBurst(scene, playerBody.position, PALETTE.accentPurple)
        audio.playSfx(880, 0.15, 'sine')
      }

      for (const gem of gems) {
        if (!gem.collected && isNearGem(playerBody.position, gem.position)) {
          gem.collected = true
          gem.mesh.visible = false
          gemsCollected += 1
          spawnBurst(scene, gem.position, PALETTE.accentPink)
          audio.playSfx(784, 0.15)
        }
      }
    },
    getSpeedMultiplier() {
      return dashTimeRemaining > 0 ? DASH_SPEED_MULTIPLIER : 1
    },
    checkOutcome() {
      return checkUnicornOutcome({ gemsCollected, totalGems: GEM_POSITIONS.length, playerPosition: playerBody.position })
    },
    reset() {
      gemsCollected = 0
      dashCooldownRemaining = 0
      dashTimeRemaining = 0
      for (const gem of gems) {
        gem.collected = false
        gem.mesh.visible = true
      }
    },
  }
}
