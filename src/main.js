import * as THREE from 'three'
import { createScene } from './scene.js'
import { InputController } from './input.js'
import { CHARACTER, createWorld, createGroundBody, createPlayerBody } from './physics.js'
import { PlayerController } from './player-controller.js'
import { SCREENS, createGameState, start, interstitialDone, levelWon, levelFailed } from './game-loop.js'
import { LEVELS, getLevel, describeMechanics } from './levels/registry.js'

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

function resetPlayer() {
  playerBody.position.set(0, CHARACTER.height, 0)
  playerBody.velocity.set(0, 0, 0)
  playerBody.angularVelocity.set(0, 0, 0)
}

const runtimeCache = new Map()
let currentRuntime = null

function enterLevel(levelIndex) {
  if (!runtimeCache.has(levelIndex)) {
    runtimeCache.set(levelIndex, getLevel(levelIndex).createRuntime({ scene, world, playerBody }))
  }
  currentRuntime = runtimeCache.get(levelIndex)
  currentRuntime.reset()
  resetPlayer()
}

function createScreen(id, html) {
  const el = document.createElement('div')
  el.id = id
  el.className = 'screen'
  el.style.cssText =
    'position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#fff;background:rgba(0,0,0,0.75);font-family:sans-serif;text-align:center;'
  el.innerHTML = html
  document.body.appendChild(el)
  return el
}

const menuScreen = createScreen('screen-menu', '<h1>Oricade</h1><button id="start-btn">Start</button>')
const interstitialScreen = createScreen('screen-interstitial', '')
const gameOverScreen = createScreen('screen-gameover', '<h1>Game Over</h1><button id="restart-btn">Restart</button>')
const victoryScreen = createScreen('screen-victory', '<h1>Victory!</h1><button id="restart-btn-victory">Play Again</button>')

const livesHud = document.createElement('div')
livesHud.id = 'lives-hud'
livesHud.style.cssText = 'position:fixed;top:8px;right:8px;color:#fff;font:16px monospace;'
document.body.appendChild(livesHud)

const debugOverlay = document.createElement('pre')
debugOverlay.id = 'input-debug'
debugOverlay.style.cssText =
  'position:fixed;top:0;left:0;margin:0;padding:8px;color:#0f0;background:rgba(0,0,0,0.6);font:12px monospace;pointer-events:none;'
document.body.appendChild(debugOverlay)

let gameState = createGameState()

function renderScreens() {
  menuScreen.style.display = gameState.screen === SCREENS.MENU ? 'flex' : 'none'
  interstitialScreen.style.display = gameState.screen === SCREENS.INTERSTITIAL ? 'flex' : 'none'
  gameOverScreen.style.display = gameState.screen === SCREENS.GAME_OVER ? 'flex' : 'none'
  victoryScreen.style.display = gameState.screen === SCREENS.VICTORY ? 'flex' : 'none'
  livesHud.textContent = `Lives: ${gameState.lives}`

  if (gameState.screen === SCREENS.INTERSTITIAL) {
    const level = getLevel(gameState.levelIndex)
    interstitialScreen.innerHTML = `<h2>Level ${level.id} — ${level.theme}</h2><p>Perspective: ${level.perspective}</p><p>Objective: ${level.objective}</p><p>Controls: ${describeMechanics(level.mechanics)}</p>`
  }
}

function applyTransition(transitionFn, ...args) {
  gameState = transitionFn(gameState, ...args)
  renderScreens()
  if (gameState.screen === SCREENS.INTERSTITIAL) {
    setTimeout(() => {
      enterLevel(gameState.levelIndex)
      applyTransition(interstitialDone)
    }, 3000)
  }
}

document.getElementById('start-btn').addEventListener('click', () => applyTransition(start))
document.getElementById('restart-btn').addEventListener('click', () => {
  gameState = createGameState()
  applyTransition(start)
})
document.getElementById('restart-btn-victory').addEventListener('click', () => {
  gameState = createGameState()
  applyTransition(start)
})

renderScreens()

const FIXED_STEP = 1 / 60
let lastTime = performance.now()

renderer.setAnimationLoop(() => {
  const now = performance.now()
  const dt = Math.min((now - lastTime) / 1000, 0.1)
  lastTime = now

  const state = input.getState()

  if (gameState.screen === SCREENS.LEVEL) {
    controller.update(state.p1)
    world.step(FIXED_STEP, dt)
    playerMesh.position.copy(playerBody.position)
    playerMesh.quaternion.copy(playerBody.quaternion)

    currentRuntime.update(state.p1, dt)
    const outcome = currentRuntime.checkOutcome()
    if (outcome === 'win') applyTransition(levelWon, LEVELS.length)
    else if (outcome === 'fail') applyTransition(levelFailed)
  }

  const { x, y, z } = playerBody.position
  debugOverlay.textContent = `screen=${gameState.screen} level=${gameState.levelIndex} lives=${gameState.lives}\nP1 ${JSON.stringify(state.p1)}\nP2 ${JSON.stringify(state.p2)}\npos=(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
  renderer.render(scene, camera)
})
