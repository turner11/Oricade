import * as THREE from 'three'
import { createScene } from './scene.js'
import { InputController, describeKeyMap } from './input.js'
import { CHARACTER, createWorld, createGroundBody, createPlayerBody } from './physics.js'
import { PlayerController } from './player-controller.js'
import { SCREENS, createGameState, start, interstitialDone, levelWon, levelFailed, selectLevel } from './game-loop.js'
import { LEVELS, getLevel, describeMechanics } from './levels/registry.js'
import { PALETTE } from './theme.js'
import { updateBursts } from './effects/particles.js'
import { triggerShake, tickShake } from './effects/screenshake.js'
import { audio, noteFrequency } from './audio.js'

const { scene, camera } = createScene(window.innerWidth / window.innerHeight)
const baseCameraPosition = camera.position.clone()

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
  new THREE.MeshStandardMaterial({ color: PALETTE.player }),
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

const helperPanel = document.createElement('div')
helperPanel.id = 'helper-panel'
helperPanel.style.cssText =
  'position:fixed;top:0;right:0;bottom:0;width:280px;display:none;flex-direction:column;gap:12px;padding:16px;overflow-y:auto;background:rgba(0,0,0,0.85);color:#fff;font-family:sans-serif;font-size:13px;z-index:10;'
document.body.appendChild(helperPanel)

function renderHelperPanel() {
  const keyRows = describeKeyMap()
    .map((row) => `<tr><td>${row.action}</td><td>${row.p1}</td><td>${row.p2}</td></tr>`)
    .join('')
  const level = getLevel(gameState.levelIndex)
  const levelButtons = LEVELS.map(
    (l, i) => `<button data-level-index="${i}" style="display:block;width:100%;margin-bottom:4px;">${l.id}. ${l.theme}</button>`,
  ).join('')

  helperPanel.innerHTML = `
    <h3 style="margin:0;">Helper (H to close)</h3>
    <div>
      <h4 style="margin:4px 0;">Current level</h4>
      <p style="margin:2px 0;">${level.theme} — ${level.objective}</p>
      <p style="margin:2px 0;">Controls: ${describeMechanics(level.mechanics)}</p>
      <button id="helper-restart-btn">Restart Level</button>
    </div>
    <div>
      <h4 style="margin:4px 0;">Keyboard mapping</h4>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <tr><th align="left">Action</th><th align="left">P1</th><th align="left">P2</th></tr>
        ${keyRows}
      </table>
    </div>
    <div>
      <h4 style="margin:4px 0;">Select level</h4>
      ${levelButtons}
    </div>
  `

  document.getElementById('helper-restart-btn').addEventListener('click', () => {
    if (gameState.screen === SCREENS.LEVEL) enterLevel(gameState.levelIndex)
  })
  helperPanel.querySelectorAll('[data-level-index]').forEach((btn) => {
    btn.addEventListener('click', () => applyTransition(selectLevel, Number(btn.dataset.levelIndex)))
  })
}

window.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyH') return
  const showing = helperPanel.style.display === 'flex'
  if (showing) {
    helperPanel.style.display = 'none'
  } else {
    renderHelperPanel()
    helperPanel.style.display = 'flex'
  }
})

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
  const previousScreen = gameState.screen
  gameState = transitionFn(gameState, ...args)
  renderScreens()

  if (gameState.screen === SCREENS.INTERSTITIAL) {
    audio.playMusicForLevel(gameState.levelIndex)
    if (previousScreen === SCREENS.LEVEL) triggerShake() // juice: shake on a failed attempt
    setTimeout(() => {
      enterLevel(gameState.levelIndex)
      applyTransition(interstitialDone)
    }, 3000)
  } else if (gameState.screen === SCREENS.VICTORY) {
    audio.playSfx(noteFrequency(gameState.levelIndex) * 2, 0.4, 'triangle')
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
    currentRuntime.update(state.p1, dt)
    const speedMultiplier = currentRuntime.getSpeedMultiplier ? currentRuntime.getSpeedMultiplier() : 1
    controller.update(state.p1, speedMultiplier)
    world.step(FIXED_STEP, dt)
    playerMesh.position.copy(playerBody.position)
    playerMesh.quaternion.copy(playerBody.quaternion)

    const outcome = currentRuntime.checkOutcome()
    if (outcome === 'win') applyTransition(levelWon, LEVELS.length)
    else if (outcome === 'fail') applyTransition(levelFailed)
  }

  updateBursts(scene, dt)
  const shake = tickShake(dt)
  camera.position.lerp(
    new THREE.Vector3(baseCameraPosition.x + shake.x, baseCameraPosition.y + shake.y, baseCameraPosition.z + shake.z),
    0.3,
  )

  const { x, y, z } = playerBody.position
  debugOverlay.textContent = `screen=${gameState.screen} level=${gameState.levelIndex} lives=${gameState.lives}\nP1 ${JSON.stringify(state.p1)}\nP2 ${JSON.stringify(state.p2)}\npos=(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
  renderer.render(scene, camera)
})
