// Phaser-free settings/input logic: pure functions only, colocated-tested like save.js/dialogue.js.
// stickVector lives here (not a second module) because it's the touch half of the same "how is
// this game controlled" concern as the keybinds.

import { TYPEWRITER_MS_PER_CHAR, STICK_DEADZONE } from './game-config.js'

export const KEY_ACTIONS = ['up', 'down', 'left', 'right', 'attack', 'dash']

export const DEFAULT_KEYS = { up: 'W', down: 'S', left: 'A', right: 'D', attack: 'SPACE', dash: 'SHIFT' }

// Phaser KeyCodes accepted for rebinding: a single A-Z letter, or one of these named keys.
// Digits are deliberately excluded — Phaser's KeyCodes table has ZERO..NINE, not '0'..'9', so a
// single-digit name would pass validation, get persisted, then addKey('5') would silently
// produce a dead key that never fires.
const NAMED_KEYS = new Set([
  'SPACE',
  'SHIFT',
  'CTRL',
  'ALT',
  'ENTER',
  'TAB',
  'UP',
  'DOWN',
  'LEFT',
  'RIGHT',
])

// Trust boundary: an unknown string reaching input.keyboard.addKey() throws at boot on every
// reload — the same unrecoverable-save failure save.js's zone-range check already guards against.
export function isValidKeyName(name) {
  if (typeof name !== 'string') return false
  if (/^[A-Z]$/.test(name)) return true
  return NAMED_KEYS.has(name)
}

export function defaultSettings() {
  return { keys: { ...DEFAULT_KEYS }, textSpeed: TYPEWRITER_MS_PER_CHAR, volume: 1, muted: false }
}

// Per-field tolerate-and-default, never whole-object reject — mirrors save.js's deserialize().
// ponytail: duplicate bindings (e.g. attack and dash both on SPACE) are allowed, not rejected —
// annoying, not broken. Rejecting it needs a whole conflict-resolution UI; add one if it's asked for.
export function mergeSettings(raw) {
  const defaults = defaultSettings()
  const src = raw && typeof raw === 'object' ? raw : {}
  const srcKeys = src.keys && typeof src.keys === 'object' ? src.keys : {}

  const keys = {}
  for (const action of KEY_ACTIONS) {
    keys[action] = isValidKeyName(srcKeys[action]) ? srcKeys[action] : defaults.keys[action]
  }

  const textSpeed =
    typeof src.textSpeed === 'number' && Number.isFinite(src.textSpeed) && src.textSpeed > 0
      ? src.textSpeed
      : defaults.textSpeed

  const volume =
    typeof src.volume === 'number' && Number.isFinite(src.volume)
      ? Math.min(1, Math.max(0, src.volume))
      : defaults.volume

  const muted = typeof src.muted === 'boolean' ? src.muted : defaults.muted

  return { keys, textSpeed, volume, muted }
}

// KeyboardEvent -> Phaser key name for rebind capture, or null when the key isn't bindable (the
// capture is then ignored, binding unchanged).
export function keyNameFromEvent(event) {
  const NAMED = {
    ' ': 'SPACE',
    Shift: 'SHIFT',
    Control: 'CTRL',
    Alt: 'ALT',
    Enter: 'ENTER',
    Tab: 'TAB',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
  }
  if (NAMED[event.key]) return NAMED[event.key]
  const upper = event.key?.toUpperCase?.()
  return isValidKeyName(upper) ? upper : null
}

// Touch joystick offset -> -1..1 vector: dead inside STICK_DEADZONE, otherwise scaled by radius
// and clamped to magnitude 1. Screen-space y-down, matching clientY and Phaser's world axes.
export function stickVector(dx, dy, radius) {
  const mag = Math.hypot(dx, dy)
  if (mag < STICK_DEADZONE * radius) return { x: 0, y: 0 }
  const scale = Math.min(1, mag / radius) / mag
  return { x: dx * scale, y: dy * scale }
}
