// Phaser-free save schema: pure functions only, no localStorage calls here (that lives in
// scene.js, the untested Phaser glue layer) so this stays vitest-testable.

import { PLAYER_MAX_HP } from './game-config.js'
import { spawnPoint } from './zone.js'

export const SAVE_KEY = 'goj-save'
export const SAVE_VERSION = 3

export function defaultState() {
  return {
    zone: 0,
    player: { ...spawnPoint(0), hp: PLAYER_MAX_HP },
    inventory: [],
    talkedToNpc: false,
  }
}

export function serialize(state) {
  return JSON.stringify({ version: SAVE_VERSION, ...state })
}

// Returns null on corrupt JSON, missing player/inventory/talkedToNpc fields, or a save from a
// schema version newer than this build understands. A save from an older version (e.g. a v2 save
// that pre-dates zones) is not rejected outright — every field it does carry is still validated,
// and a missing/non-numeric `zone` just defaults to 0 rather than nuking the whole save.
export function deserialize(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed?.version !== 'number' || parsed.version > SAVE_VERSION) return null
  if (!parsed.player || !parsed.inventory) return null
  if (typeof parsed.talkedToNpc !== 'boolean') return null

  return {
    zone: typeof parsed.zone === 'number' ? parsed.zone : 0,
    player: parsed.player,
    inventory: parsed.inventory,
    talkedToNpc: parsed.talkedToNpc,
  }
}
