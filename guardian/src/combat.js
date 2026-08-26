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
  BOSS_HP_1,
  BOSS_HP_2,
  BOSS_FIRE_MS,
} from './game-config.js'

// String id constants that live in the save's `skills` array — same precedent as zone.js's
// SHRINE_KEY living in the save's `inventory` array. Also doubles as the boss marker: a def with
// `unlocks` set IS a boss, so no separate `boss: true` field.
export const DASH = 'dash'
export const CHARGED_ATTACK = 'charged-attack'

// One table for all six v1 kinds, not six parallel ones. Ash/Whisper are night reskins of
// Zane/Stormy — see the `phase` field. `speed`/`dashSpeed` only exist on kinds whose behaviour
// moves them (chaser, erratic); casters and the guard are stationary.
export const ENEMY = {
  zane: {
    color: 0xb23a48,
    behavior: 'chaser',
    hp: ZANE_HP,
    speed: ZANE_SPEED,
    dashSpeed: ZANE_DASH_SPEED,
    phase: 'day',
  },
  ash: {
    color: 0xd1cfe2,
    behavior: 'chaser',
    hp: ZANE_HP,
    speed: ZANE_SPEED * ASH_SPEED_MULT,
    dashSpeed: ZANE_DASH_SPEED * ASH_SPEED_MULT,
    phase: 'night',
  },
  stormy: {
    color: 0x4a7ba6,
    behavior: 'caster',
    hp: 2,
    projectiles: 1,
    fireMs: STORMY_FIRE_MS,
    phase: 'day',
  },
  whisper: {
    color: 0x5a4a86,
    behavior: 'caster',
    hp: 2,
    projectiles: 2,
    fireMs: STORMY_FIRE_MS,
    phase: 'night',
  },
  ember: { color: 0xd1611a, behavior: 'guard', hp: 4 },
  gale: { color: 0x8ad1c2, behavior: 'erratic', hp: 1, speed: GALE_SPEED, contactDamage: 0 },
  // Bosses: ordinary entries whose `behavior` is an array of two of the four behaviors above,
  // run in order by the same switch (see scene.js's update()). No new moveset, no `phase` field
  // (must survive a day/night flip mid-fight — see setPhase()'s comment on Ember). `unlocks` is
  // both the skill this boss's death grants and the marker that makes this entry a boss.
  // ponytail: one boss = two already-learned patterns run back-to-back, no blending/phases —
  // revisit if a future pair both drive velocity in the same frame (see plan's Open risks).
  tempest: {
    color: 0x2e7d9e,
    behavior: ['chaser', 'caster'],
    hp: BOSS_HP_1,
    speed: ZANE_SPEED,
    dashSpeed: ZANE_DASH_SPEED,
    projectiles: 1,
    fireMs: BOSS_FIRE_MS,
    unlocks: DASH,
  },
  // 'guard' is a break-only case in scene.js's switch — it recombines nothing, since contact
  // damage already applies to every enemy via the enemyGroup overlap regardless of behavior.
  // 'erratic' (Gale's pattern) is a real second pattern here, and keeps Torrent distinct from
  // Tempest's ['chaser', 'caster'] pairing. Reuses GALE_SPEED rather than a new boss-speed knob.
  torrent: {
    color: 0x1a4d99,
    behavior: ['erratic', 'caster'],
    hp: BOSS_HP_2,
    speed: GALE_SPEED,
    projectiles: 2,
    fireMs: BOSS_FIRE_MS,
    unlocks: CHARGED_ATTACK,
  },
}

// One placement list per zone, tile coords converted with the same `c * TILE + TILE / 2` idiom
// spawnPoint() uses. `patrol` (chaser waypoints) is tile coords too, converted the same way.
const zaneWaypoints = [
  { col: 20, row: 3 },
  { col: 30, row: 3 },
  { col: 30, row: 8 },
  { col: 20, row: 8 },
]

// Small patrol box in cols 32-36 / rows 10-14 — clear of the row-6 wall, the row-10 tree line
// (cols 20-25), the pond (rows 14-16, cols 5-9), and the shrine room (rows 17-21, cols 30-35).
const tempestWaypoints = [
  { col: 32, row: 10 },
  { col: 36, row: 10 },
  { col: 36, row: 14 },
  { col: 32, row: 14 },
]

export const ZONE_ENEMIES = [
  [
    { kind: 'zane', at: { col: 20, row: 3 }, patrol: zaneWaypoints },
    { kind: 'ash', at: { col: 20, row: 3 }, patrol: zaneWaypoints },
    // Boss: stands between the player and zone 0's 'E' warp (col 38, row 12).
    { kind: 'tempest', at: { col: 34, row: 12 }, patrol: tempestWaypoints },
  ],
  [
    { kind: 'stormy', at: { col: 23, row: 13 } }, // beside the pond
    { kind: 'ember', at: { col: 32, row: 22 } }, // in front of the shrine door
    // Boss: stands between the player and zone 1's 'E' warp (col 38, row 12); erratic movement
    // needs no patrol waypoints (unlike chaser). Clear of that zone's pond (rows 14-16, cols
    // 20-24) and shrine room.
    { kind: 'torrent', at: { col: 34, row: 12 } },
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

export function attackRect(x, y, facing, scale = 1) {
  const offset = OFFSETS[facing] ?? OFFSETS.down
  return {
    x: x + offset.x,
    y: y + offset.y,
    width: TILE * 0.6 * scale,
    height: TILE * 0.6 * scale,
  }
}

export function takeHit(state, now, iframeMs, damage = 1) {
  if (now < state.invincibleUntil) return state
  return { hp: Math.max(0, state.hp - damage), invincibleUntil: now + iframeMs }
}

// Dash impulse for `facing`, derived from the same OFFSETS table attackRect uses (divide out the
// reach distance, scale to the requested speed) — no separate direction->vector table.
export function dashVelocity(facing, speed) {
  const offset = OFFSETS[facing] ?? OFFSETS.down
  return { x: (offset.x / ATTACK_REACH) * speed, y: (offset.y / ATTACK_REACH) * speed }
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
