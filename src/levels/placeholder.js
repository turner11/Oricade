import * as THREE from 'three'
import { checkLevelOutcome } from '../level.js'
import { PALETTE } from '../theme.js'
import { spawnBurst } from '../effects/particles.js'
import { audio } from '../audio.js'

export const MARKER_POSITION = { x: 10, y: 0.5, z: 0 }

export function createRuntime({ scene, playerBody }) {
  const markerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({ color: PALETTE.accentGold }),
  )
  markerMesh.position.set(MARKER_POSITION.x, MARKER_POSITION.y, MARKER_POSITION.z)
  scene.add(markerMesh)

  let wonBurstPlayed = false

  return {
    update() {
      if (!wonBurstPlayed && checkLevelOutcome(playerBody.position, MARKER_POSITION) === 'win') {
        wonBurstPlayed = true
        spawnBurst(scene, MARKER_POSITION, PALETTE.accentGold)
        audio.playSfx(660, 0.2)
      }
    },
    checkOutcome() {
      return checkLevelOutcome(playerBody.position, MARKER_POSITION)
    },
    reset() {
      wonBurstPlayed = false
    },
  }
}
