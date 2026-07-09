import * as THREE from 'three'
import { createScene } from './scene.js'
import { InputController } from './input.js'
import { CHARACTER, createWorld, createGroundBody, createPlayerBody } from './physics.js'
import { PlayerController } from './player-controller.js'

const { scene, camera } = createScene(window.innerWidth / window.innerHeight)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const input = new InputController()

const world = createWorld()
world.addBody(createGroundBody())
const playerBody = createPlayerBody()
world.addBody(playerBody)
const controller = new PlayerController(playerBody)

const playerMesh = new THREE.Mesh(
  new THREE.BoxGeometry(CHARACTER.width, CHARACTER.height, CHARACTER.width),
  new THREE.MeshStandardMaterial({ color: 0x4488ff }),
)
scene.add(playerMesh)

const debugOverlay = document.createElement('pre')
debugOverlay.id = 'input-debug'
debugOverlay.style.cssText =
  'position:fixed;top:0;left:0;margin:0;padding:8px;color:#0f0;background:rgba(0,0,0,0.6);font:12px monospace;pointer-events:none;'
document.body.appendChild(debugOverlay)

const FIXED_STEP = 1 / 60
let lastTime = performance.now()

renderer.setAnimationLoop(() => {
  const now = performance.now()
  const dt = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now

  const state = input.getState()
  controller.update(state.p1)
  world.step(FIXED_STEP, dt)

  playerMesh.position.copy(playerBody.position)
  playerMesh.quaternion.copy(playerBody.quaternion)

  debugOverlay.textContent = `P1 ${JSON.stringify(state.p1)}\nP2 ${JSON.stringify(state.p2)}\ny=${playerBody.position.y.toFixed(2)}`
  renderer.render(scene, camera)
})
