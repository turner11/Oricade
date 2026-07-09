import * as THREE from 'three'
import { hasFallenOff } from '../level.js'
import { PALETTE } from '../theme.js'
import { spawnBurst } from '../effects/particles.js'
import { triggerShake } from '../effects/screenshake.js'
import { audio } from '../audio.js'

export const WAVE_COUNT = 3
export const ENEMIES_PER_WAVE = 3
export const SHOOT_RANGE = 6
export const FIRE_COOLDOWN = 0.4
export const ENEMY_ANCHOR = { x: 10, y: 1, z: 0 }
export const ENEMY_OFFSETS = [-2.5, 0, 2.5]

export function checkSpaceFleetOutcome({ wavesDestroyed, playerPosition }) {
  if (wavesDestroyed >= WAVE_COUNT) return 'win'
  if (hasFallenOff(playerPosition)) return 'fail'
  return null
}

export function hudStatus({ wavesDestroyed }) {
  return `🚀 WAVE ${Math.min(wavesDestroyed + 1, WAVE_COUNT)}/${WAVE_COUNT}`
}

function distance3D(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function isEnemyInRange(playerPosition, enemyPosition) {
  return distance3D(playerPosition, enemyPosition) < SHOOT_RANGE
}

export function shouldFire(shootPressed, cooldownRemaining) {
  return shootPressed && cooldownRemaining <= 0
}

function makeWaveEnemies(scene) {
  return ENEMY_OFFSETS.map((zOffset) => {
    const position = { x: ENEMY_ANCHOR.x, y: ENEMY_ANCHOR.y, z: ENEMY_ANCHOR.z + zOffset }
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 6), new THREE.MeshStandardMaterial({ color: PALETTE.accentCyan }))
    mesh.position.set(position.x, position.y, position.z)
    mesh.rotation.z = Math.PI / 2
    scene.add(mesh)
    return { position, mesh, alive: true }
  })
}

export function createRuntime({ scene, playerBody }) {
  let wavesDestroyed = 0
  let fireCooldownRemaining = 0
  let enemies = makeWaveEnemies(scene)

  function spawnNextWave() {
    for (const enemy of enemies) scene.remove(enemy.mesh)
    enemies = makeWaveEnemies(scene)
  }

  return {
    update(inputP1, dt) {
      fireCooldownRemaining = Math.max(0, fireCooldownRemaining - dt)

      if (shouldFire(inputP1.shoot, fireCooldownRemaining)) {
        const target = enemies.find((e) => e.alive && isEnemyInRange(playerBody.position, e.position))
        if (target) {
          target.alive = false
          target.mesh.visible = false
          fireCooldownRemaining = FIRE_COOLDOWN
          spawnBurst(scene, target.position, PALETTE.accentCyan)
          audio.playSfx(392, 0.12, 'sawtooth')
          triggerShake()
        }
      }

      if (wavesDestroyed < WAVE_COUNT && enemies.every((e) => !e.alive)) {
        wavesDestroyed += 1
        if (wavesDestroyed < WAVE_COUNT) spawnNextWave()
      }
    },
    getHudStatus() {
      return hudStatus({ wavesDestroyed })
    },
    checkOutcome() {
      return checkSpaceFleetOutcome({ wavesDestroyed, playerPosition: playerBody.position })
    },
    reset() {
      wavesDestroyed = 0
      fireCooldownRemaining = 0
      spawnNextWave()
    },
  }
}
