// Phaser-free combat logic: pure helpers, colocated tests under vitest (no canvas/DOM).
// Consumed by scene.js, which is where the untestable Phaser wiring lives.

import { TILE, ZONE, isSolid } from './zone.js'
import { ATTACK_REACH } from './game-config.js'

// Fixed patrol path on open grass, derived from tile coords the same way spawnPoint() does.
export const ZANE_PATROL = [
  { x: 20 * TILE + TILE / 2, y: 3 * TILE + TILE / 2 },
  { x: 30 * TILE + TILE / 2, y: 3 * TILE + TILE / 2 },
  { x: 30 * TILE + TILE / 2, y: 8 * TILE + TILE / 2 },
  { x: 20 * TILE + TILE / 2, y: 8 * TILE + TILE / 2 },
]

const OFFSETS = {
  up: { x: 0, y: -ATTACK_REACH },
  down: { x: 0, y: ATTACK_REACH },
  left: { x: -ATTACK_REACH, y: 0 },
  right: { x: ATTACK_REACH, y: 0 },
}

export function attackRect(x, y, facing) {
  const offset = OFFSETS[facing] ?? OFFSETS.down
  return { x: x + offset.x, y: y + offset.y, width: TILE * 0.6, height: TILE * 0.6 }
}

export function takeHit(state, now, iframeMs) {
  if (now < state.invincibleUntil) return state
  return { hp: Math.max(0, state.hp - 1), invincibleUntil: now + iframeMs }
}

// ponytail: samples every half-tile rather than a proper DDA raycast — upgrade if it starts
// missing thin diagonal cover (two solid tiles meeting corner-to-corner can squeak a line through).
export function hasLineOfSight(from, to, range) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist > range) return false

  const step = TILE / 2
  const samples = Math.ceil(dist / step)
  for (let i = 0; i <= samples; i++) {
    const t = samples === 0 ? 0 : i / samples
    const x = from.x + dx * t
    const y = from.y + dy * t
    const col = Math.floor(x / TILE)
    const row = Math.floor(y / TILE)
    if (isSolid(ZONE[row][col])) return false
  }
  return true
}

export function heartString(hp, max) {
  return '♥'.repeat(hp) + '♡'.repeat(max - hp)
}
