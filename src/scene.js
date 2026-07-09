import * as THREE from 'three'
import { PALETTE } from './theme.js'

export function createScene(aspect = 16 / 9) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x11111a)

  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
  camera.position.set(0, 5, 10)
  camera.lookAt(0, 0, 0)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: PALETTE.ground }),
  )
  ground.name = 'ground'
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(5, 10, 5)
  scene.add(light)

  scene.add(new THREE.AmbientLight(0xffffff, 0.3))

  return { scene, camera }
}
