import * as THREE from 'three'

// Per-level world dressing: sky color, ground tint, and low-poly scenery.
// Pure scenery — no physics bodies, no gameplay logic.

function mesh(geometry, color, x = 0, y = 0, z = 0, basic = false) {
  const Material = basic ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial
  const m = new THREE.Mesh(geometry, new Material({ color }))
  m.position.set(x, y, z)
  return m
}

function group(name, ...children) {
  const g = new THREE.Group()
  g.name = name
  g.add(...children)
  return g
}

// Ring of dome hills around the play area (x∈[0,20], z∈[-8,8] stays clear).
function hills(colors) {
  const spots = [
    [-20, -16, 7],
    [-6, -20, 9],
    [8, -19, 6],
    [20, -15, 8],
    [-18, 14, 8],
    [0, 20, 10],
    [16, 17, 7],
  ]
  return group(
    'hills',
    ...spots.map(([x, z, r], i) => {
      const hill = mesh(new THREE.SphereGeometry(r, 10, 8), colors[i % colors.length], x, 0, z)
      hill.scale.y = 0.6
      return hill
    }),
  )
}

function sun(color = 0xffe066) {
  return mesh(new THREE.SphereGeometry(2.5, 12, 10), color, -18, 16, -30, true)
}

function tree(x, z, canopyColor) {
  const t = new THREE.Group()
  t.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2), 0x8a5a2b, 0, 0.6, 0))
  t.add(mesh(new THREE.ConeGeometry(0.9, 1.8, 7), canopyColor, 0, 2.1, 0))
  t.position.set(x, 0, z)
  return t
}

function forest(spots, colors) {
  return group('trees', ...spots.map(([x, z], i) => tree(x, z, colors[i % colors.length])))
}

const TREE_SPOTS = [
  [-4, -7],
  [2, -9],
  [9, -8],
  [16, -9],
  [22, -6],
  [-3, 7],
  [5, 9],
  [12, 8],
  [19, 7],
]

function clouds() {
  const puffSpots = [
    [-8, 9, -14],
    [4, 11, -18],
    [14, 8, -12],
    [22, 10, -16],
  ]
  return group(
    'clouds',
    ...puffSpots.map(([x, y, z]) => {
      const puff = new THREE.Group()
      for (const [dx, s] of [
        [-1, 0.8],
        [0, 1.2],
        [1.1, 0.9],
      ]) {
        puff.add(mesh(new THREE.SphereGeometry(s, 8, 6), 0xffffff, dx, 0, 0, true))
      }
      puff.position.set(x, y, z)
      return puff
    }),
  )
}

// Field/court boundary drawn as thin boxes lying on the ground.
function boundaryLines(xMin, xMax, zMin, zMax) {
  const w = xMax - xMin
  const d = zMax - zMin
  const cx = (xMin + xMax) / 2
  const cz = (zMin + zMax) / 2
  return [
    mesh(new THREE.BoxGeometry(w, 0.02, 0.15), 0xffffff, cx, 0.02, zMin, true),
    mesh(new THREE.BoxGeometry(w, 0.02, 0.15), 0xffffff, cx, 0.02, zMax, true),
    mesh(new THREE.BoxGeometry(0.15, 0.02, d), 0xffffff, xMin, 0.02, cz, true),
    mesh(new THREE.BoxGeometry(0.15, 0.02, d), 0xffffff, xMax, 0.02, cz, true),
    mesh(new THREE.BoxGeometry(0.15, 0.02, d), 0xffffff, cx, 0.02, cz, true), // halfway line
  ]
}

function centerCircle(x, radius) {
  const circle = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.2, radius, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
  )
  circle.rotation.x = -Math.PI / 2
  circle.position.set(x, 0.02, 0)
  return circle
}

// Three stepped bleacher rows along one sideline.
function bleachers(color, z) {
  const side = Math.sign(z)
  return group(
    `bleachers-${side > 0 ? 'far' : 'near'}`,
    ...[0, 1, 2].map((row) => mesh(new THREE.BoxGeometry(26, 0.8, 1.2), color, 10, 0.4 + row * 0.8, z + side * row * 1.2)),
  )
}

function soccerStadium() {
  return group(
    'soccer-stadium',
    group('pitch-lines', ...boundaryLines(0, 20, -8, 8), centerCircle(10, 2.9)),
    bleachers(0x8890a8, -11),
    bleachers(0x8890a8, 11),
    hills([0x3d8c50, 0x2f7a44]),
  )
}

function basketballArena() {
  return group(
    'basketball-arena',
    group('court-lines', ...boundaryLines(0, 20, -6, 6), centerCircle(10, 1.8)),
    bleachers(0x394263, -9),
    bleachers(0x394263, 9),
  )
}

function boxingRing() {
  const corners = [
    [-2, -5],
    [-2, 5],
    [11, -5],
    [11, 5],
  ]
  const parts = corners.map(([x, z]) => mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.6), 0xff5c8a, x, 0.8, z))
  for (const h of [0.6, 1.0, 1.4]) {
    parts.push(
      mesh(new THREE.BoxGeometry(13, 0.05, 0.05), 0xffffff, 4.5, h, -5),
      mesh(new THREE.BoxGeometry(13, 0.05, 0.05), 0xffffff, 4.5, h, 5),
      mesh(new THREE.BoxGeometry(0.05, 0.05, 10), 0xffffff, -2, h, 0),
      mesh(new THREE.BoxGeometry(0.05, 0.05, 10), 0xffffff, 11, h, 0),
    )
  }
  return group('ring', ...parts)
}

function starfield() {
  const positions = new Float32Array(300 * 3)
  for (let i = 0; i < 300; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 90
    positions[i * 3 + 1] = 4 + Math.random() * 40
    positions[i * 3 + 2] = (Math.random() - 0.5) * 90
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 }))
  stars.name = 'stars'
  return group('space', stars, mesh(new THREE.SphereGeometry(4, 16, 12), 0xb266ff, 26, 14, -34, true))
}

function dungeon() {
  const parts = []
  for (let x = 0; x <= 20; x += 5) {
    for (const z of [-6, 6]) {
      parts.push(
        mesh(new THREE.BoxGeometry(1, 4, 1), 0x55555f, x, 2, z),
        mesh(new THREE.SphereGeometry(0.18, 8, 6), 0xffa040, x, 4.2, z, true), // torch flame
      )
    }
  }
  return group('pillars', ...parts)
}

function bossArena() {
  const parts = []
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2
    parts.push(mesh(new THREE.BoxGeometry(1.2, 5, 1.2), 0x6a3fa0, 10 + Math.cos(angle) * 15, 2.5, Math.sin(angle) * 15))
  }
  return group('arena', ...parts)
}

// Index-aligned with LEVELS in levels/registry.js.
export const ENVIRONMENTS = [
  { sky: 0x87ceeb, ground: 0x4c9e5e, build: () => group('meadow', hills([0x3d8c50, 0x5cb86a]), sun(), forest(TREE_SPOTS.slice(0, 4), [0x2f7a44])) },
  { sky: 0x8fd3ff, ground: 0x3fa34d, build: soccerStadium },
  { sky: 0x23233a, ground: 0xc68642, build: basketballArena },
  { sky: 0x7ec8e3, ground: 0x8bc34a, build: () => group('skyworld', clouds(), hills([0x8bc34a, 0x66a03a])) },
  { sky: 0x1c1c2e, ground: 0x4a6cd4, build: boxingRing },
  { sky: 0xffc4e1, ground: 0x67c96a, build: () => group('magic-forest', forest(TREE_SPOTS, [0x2f9e5f, 0xff6ec7, 0x5ce1ff]), sun(0xfff3b0)) },
  { sky: 0x050510, ground: 0x11111f, build: starfield },
  { sky: 0x0d0d12, ground: 0x3a3a44, build: dungeon },
  { sky: 0x2e1040, ground: 0x3d2b52, build: bossArena },
]

// Swap the scene's backdrop to the given level: sky + ground colors and cached dressing.
export function applyEnvironment(scene, levelIndex) {
  const env = ENVIRONMENTS[levelIndex]
  scene.background = new THREE.Color(env.sky)
  scene.getObjectByName('ground').material.color.set(env.ground)

  const cache = (scene.userData.environments ??= new Map())
  for (const dressing of cache.values()) dressing.visible = false
  if (!cache.has(levelIndex)) {
    const dressing = env.build()
    dressing.name = `environment-${levelIndex}`
    scene.add(dressing)
    cache.set(levelIndex, dressing)
  }
  cache.get(levelIndex).visible = true
}

// Levels render into their own group and register physics bodies per slot; only the
// active level stays visible and simulated (an invisible parked ball would still
// shove the live one — both balls spawn at the same point).
export function activateLevel(slots, activeIndex, world) {
  for (const [index, slot] of slots) {
    const active = index === activeIndex
    slot.group.visible = active
    for (const body of slot.bodies) {
      if (active) world.addBody(body)
      else world.removeBody(body)
    }
  }
}
