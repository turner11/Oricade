// Phaser-free combat logic: pure helpers, colocated tests under vitest (no canvas/DOM).
// Consumed by scene.js, which is where the untestable Phaser wiring lives.

import { TILE, ZONES, isSolid } from './zone.js'
import {
  ATTACK_REACH,
  ZANE_SPEED,
  ZANE_DASH_SPEED,
  ASH_SPEED_MULT,
  ZANE_HP,
  GALE_SPEED,
  STORMY_FIRE_MS,
} from './game-config.js'

// One table for all six v1 kinds, not six parallel ones. Ash/Whisper are night reskins of
// Zane/Stormy — see the `phase` field. `speed`/`dashSpeed` only exist on kinds whose behaviour
// moves them (chaser, erratic); casters and the guard are stationary.
export const ENEMY = {
  zane: { color: 0xb23a48, behavior: 'chaser', hp: ZANE_HP, speed: ZANE_SPEED, dashSpeed: ZANE_DASH_SPEED, phase: 'day' },
  ash: {
    color: 0xd1cfe2,
    behavior: 'chaser',
    hp: ZANE_HP,
    speed: ZANE_SPEED * ASH_SPEED_MULT,
    dashSpeed: ZANE_DASH_SPEED * ASH_SPEED_MULT,
    phase: 'night',
  },
  stormy: { color: 0x4a7ba6, behavior: 'caster', hp: 2, projectiles: 1, fireMs: STORMY_FIRE_MS, phase: 'day' },
  whisper: { color: 0x5a4a86, behavior: 'caster', hp: 2, projectiles: 2, fireMs: STORMY_FIRE_MS, phase: 'night' },
  ember: { color: 0xd1611a, behavior: 'guard', hp: 4 },
  gale: { color: 0x8ad1c2, behavior: 'erratic', hp: 1, speed: GALE_SPEED, contactDamage: 0 },
}

// One placement list per zone, tile coords converted with the same `c * TILE + TILE / 2` idiom
// spawnPoint() uses. `patrol` (chaser waypoints) is tile coords too, converted the same way.
const zaneWaypoints = [
  { col: 20, row: 3 },
  { col: 30, row: 3 },
  { col: 30, row: 8 },
  { col: 20, row: 8 },
]

export const ZONE_ENEMIES = [
  [
    { kind: 'zane', at: { col: 20, row: 3 }, patrol: zaneWaypoints },
    { kind: 'ash', at: { col: 20, row: 3 }, patrol: zaneWaypoints },
  ],
  [
    { kind: 'stormy', at: { col: 23, row: 13 } }, // beside the pond
    { kind: 'ember', at: { col: 32, row: 22 } }, // in front of the shrine door
  ],
  [
    { kind: 'stormy', at: { col: 20, row: 5 } },
    { kind: 'whisper', at: { col: 20, row: 5 } }, // same spot as stormy, mirrors zane/ash
    { kind: 'gale', at: { col: 35, row: 10 } },
  ],
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
export function hasLineOfSight(z, from, to, range) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dist = Math.hypot(dx, dy)
  if (dist > range) return false

  const zone = ZONES[z]
  const step = TILE / 2
  const samples = Math.ceil(dist / step)
  for (let i = 0; i <= samples; i++) {
    const t = samples === 0 ? 0 : i / samples
    const x = from.x + dx * t
    const y = from.y + dy * t
    const col = Math.floor(x / TILE)
    const row = Math.floor(y / TILE)
    if (isSolid(zone[row][col])) return false
  }
  return true
}

// count === 1 -> the angle itself, unspread. Otherwise `count` angles centred on `angle`, evenly
// spanning `spread` radians. Used to fan Whisper's two-projectile volley out from Stormy's one.
export function spreadAngles(angle, count, spread) {
  if (count === 1) return [angle]
  const start = angle - spread / 2
  const step = spread / (count - 1)
  return Array.from({ length: count }, (_, i) => start + step * i)
}

export function heartString(hp, max) {
  return '♥'.repeat(hp) + '♡'.repeat(max - hp)
}
