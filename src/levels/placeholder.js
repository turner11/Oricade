import * as THREE from 'three'
import { checkLevelOutcome } from '../level.js'

export const MARKER_POSITION = { x: 10, y: 0.5, z: 0 }

export function createRuntime({ scene, playerBody }) {
  const markerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 }),
  )
  markerMesh.position.set(MARKER_POSITION.x, MARKER_POSITION.y, MARKER_POSITION.z)
  scene.add(markerMesh)

  return {
    update() {},
    checkOutcome() {
      return checkLevelOutcome(playerBody.position, MARKER_POSITION)
    },
    reset() {},
  }
}
