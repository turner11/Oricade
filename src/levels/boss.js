import * as THREE from 'three'
import { hasFallenOff } from '../level.js'
import { PALETTE } from '../theme.js'
import { spawnBurst } from '../effects/particles.js'
import { triggerShake } from '../effects/screenshake.js'
import { audio, noteFrequency } from '../audio.js'

export const PHASE_COUNT = 3
export const PHASE_MAX_HEALTH = 60
export const DAMAGE_PER_HIT = 20
export const STRIKE_RADIUS = 1.5
export const STRIKE_COOLDOWN = 0.5
export const AIRBORNE_THRESHOLD = 1.3
export const BOSS_POSITION = { x: 10, y: 0.9, z: 0 }

export const PHASES = [
  { requiredMechanic: 'shoot', dialogue: 'Phase 1: The boss channels its inner Soccer Striker — Shoot it down!' },
  { requiredMechanic: 'jump', dialogue: 'Phase 2: The boss goes full Basketball Baller — strike it while airborne!' },
  { requiredMechanic: 'magic', dialogue: 'Phase 3: The boss unleashes Unicorn Magic — dash in with your own!' },
]

export function checkBossOutcome({ phaseIndex, playerPosition }) {
  if (phaseIndex >= PHASE_COUNT) return 'win'
  if (hasFallenOff(playerPosition)) return 'fail'
  return null
}

export function hudStatus({ phaseIndex, phaseHealth }) {
  return `👑 PHASE ${Math.min(phaseIndex + 1, PHASE_COUNT)}/${PHASE_COUNT} · BOSS ${phaseHealth}/${PHASE_MAX_HEALTH}`
}

function distanceXZ(a, b) {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function canDamagePhase(phase, inputP1, playerPosition) {
  if (phase.requiredMechanic === 'shoot') return inputP1.shoot
  if (phase.requiredMechanic === 'jump') return inputP1.shoot && playerPosition.y >= AIRBORNE_THRESHOLD
  if (phase.requiredMechanic === 'magic') return inputP1.magic
  return false
}

export function shouldStrike(playerPosition, bossPosition, phase, inputP1, cooldownRemaining) {
  return (
    cooldownRemaining <= 0 &&
    distanceXZ(playerPosition, bossPosition) <= STRIKE_RADIUS &&
    canDamagePhase(phase, inputP1, playerPosition)
  )
}

export function createRuntime({ scene, playerBody }) {
  const bossMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.2), new THREE.MeshStandardMaterial({ color: PALETTE.accentPurple }))
  bossMesh.position.set(BOSS_POSITION.x, BOSS_POSITION.y, BOSS_POSITION.z)
  scene.add(bossMesh)

  const healthBarBack = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.2), new THREE.MeshBasicMaterial({ color: 0x333333 }))
  const healthBarFront = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.2), new THREE.MeshBasicMaterial({ color: PALETTE.accentRed }))
  healthBarBack.position.set(BOSS_POSITION.x, BOSS_POSITION.y + 2, BOSS_POSITION.z)
  healthBarFront.position.set(BOSS_POSITION.x, BOSS_POSITION.y + 2, BOSS_POSITION.z + 0.01)
  scene.add(healthBarBack, healthBarFront)

  const dialogueBanner = document.createElement('div')
  dialogueBanner.id = 'boss-dialogue'
  dialogueBanner.style.cssText =
    'position:fixed;top:8px;left:50%;transform:translateX(-50%);max-width:80vw;padding:8px 16px;background:rgba(0,0,0,0.7);color:#fff;font-family:sans-serif;font-size:14px;text-align:center;border-radius:6px;'
  document.body.appendChild(dialogueBanner)

  let phaseIndex = 0
  let phaseHealth = PHASE_MAX_HEALTH
  let cooldownRemaining = 0

  function updateHealthBar() {
    const fraction = Math.max(0, phaseHealth / PHASE_MAX_HEALTH)
    healthBarFront.scale.x = fraction
    healthBarFront.position.x = BOSS_POSITION.x - (2 * (1 - fraction)) / 2
  }

  function showDialogue(text) {
    dialogueBanner.textContent = text
  }

  return {
    update(inputP1, dt) {
      cooldownRemaining = Math.max(0, cooldownRemaining - dt)
      if (phaseIndex >= PHASE_COUNT) return

      const phase = PHASES[phaseIndex]
      if (shouldStrike(playerBody.position, BOSS_POSITION, phase, inputP1, cooldownRemaining)) {
        phaseHealth = Math.max(0, phaseHealth - DAMAGE_PER_HIT)
        cooldownRemaining = STRIKE_COOLDOWN
        updateHealthBar()
        spawnBurst(scene, BOSS_POSITION, PALETTE.accentRed)
        audio.playSfx(196, 0.15, 'sawtooth')
        triggerShake()

        if (phaseHealth <= 0) {
          phaseIndex += 1
          if (phaseIndex < PHASE_COUNT) {
            phaseHealth = PHASE_MAX_HEALTH
            showDialogue(PHASES[phaseIndex].dialogue)
            updateHealthBar()
            audio.playSfx(noteFrequency(phaseIndex) * 2, 0.25, 'triangle')
          } else {
            showDialogue('The boss has been defeated! Victory!')
            bossMesh.visible = false
            healthBarBack.visible = false
            healthBarFront.visible = false
            spawnBurst(scene, BOSS_POSITION, PALETTE.accentGold)
          }
        }
      }
    },
    getHudStatus() {
      return hudStatus({ phaseIndex, phaseHealth })
    },
    checkOutcome() {
      return checkBossOutcome({ phaseIndex, playerPosition: playerBody.position })
    },
    reset() {
      phaseIndex = 0
      phaseHealth = PHASE_MAX_HEALTH
      cooldownRemaining = 0
      bossMesh.visible = true
      healthBarBack.visible = true
      healthBarFront.visible = true
      updateHealthBar()
      showDialogue(PHASES[0].dialogue)
    },
  }
}
