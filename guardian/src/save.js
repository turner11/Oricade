// Phaser-free save schema: pure functions only, no localStorage calls here (that lives in
// scene.js, the untested Phaser glue layer) so this stays vitest-testable.

import { PLAYER_MAX_HP } from './game-config.js'
import { spawnPoint } from './zone.js'

export const SAVE_KEY = 'goj-save'
export const SAVE_VERSION = 2

export function defaultState() {
  return { player: { ...spawnPoint(), hp: PLAYER_MAX_HP }, inventory: [], talkedToNpc: false }
}

export function serialize(state) {
  return JSON.stringify({ version: SAVE_VERSION, ...state })
}

// Returns null on corrupt JSON, missing player/inventory/talkedToNpc fields, or a schema
// version mismatch — the caller falls back to defaultState() in every case.
export function deserialize(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (parsed?.version !== SAVE_VERSION) return null
  if (!parsed.player || !parsed.inventory) return null
  if (typeof parsed.talkedToNpc !== 'boolean') return null

  return { player: parsed.player, inventory: parsed.inventory, talkedToNpc: parsed.talkedToNpc }
}
