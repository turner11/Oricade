import * as THREE from 'three'
import { createScene } from './scene.js'
import { InputController } from './input.js'

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

const debugOverlay = document.createElement('pre')
debugOverlay.id = 'input-debug'
debugOverlay.style.cssText =
  'position:fixed;top:0;left:0;margin:0;padding:8px;color:#0f0;background:rgba(0,0,0,0.6);font:12px monospace;pointer-events:none;'
document.body.appendChild(debugOverlay)

renderer.setAnimationLoop(() => {
  const state = input.getState()
  debugOverlay.textContent = `P1 ${JSON.stringify(state.p1)}\nP2 ${JSON.stringify(state.p2)}`
  renderer.render(scene, camera)
})
