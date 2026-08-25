// Phaser-free day/night clock: pure helper, colocated-tested (no canvas/DOM), consumed by
// scene.js the same way dialogue.js/combat.js/save.js are.

import { PHASE_MS } from './game-config.js'

// Alternates day/night every PHASE_MS, starting in day so a fresh session can always reach
// the GoJ 06 NPC flow immediately.
export function phaseAt(elapsedMs) {
  return Math.floor(elapsedMs / PHASE_MS) % 2 === 0 ? 'day' : 'night'
}
