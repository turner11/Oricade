import { describe, it, expect } from 'vitest'
import { PLAYER_MAX_HP } from './game-config.js'
import { spawnPoint } from './zone.js'
import { SAVE_KEY, SAVE_VERSION, defaultState, serialize, deserialize } from './save.js'

describe('defaultState', () => {
  it('starts fresh at the spawn point with full HP and an empty inventory', () => {
    const state = defaultState()
    expect(state.player).toEqual({ ...spawnPoint(), hp: PLAYER_MAX_HP })
    expect(state.inventory).toEqual([])
  })
})

describe('serialize/deserialize', () => {
  it('round-trips a valid state', () => {
    const state = defaultState()
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('rejects corrupt JSON', () => {
    expect(deserialize('{not json')).toBe(null)
  })

  it('rejects a save missing player or inventory fields', () => {
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION }))).toBe(null)
    expect(
      deserialize(JSON.stringify({ version: SAVE_VERSION, player: { x: 0, y: 0, hp: 3 } }))
    ).toBe(null)
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION, inventory: [] }))).toBe(null)
  })

  it('rejects a mismatched schema version', () => {
    expect(
      deserialize(
        JSON.stringify({ version: 999, player: { x: 0, y: 0, hp: 3 }, inventory: [] })
      )
    ).toBe(null)
  })
})

describe('SAVE_KEY', () => {
  it('is a stable localStorage key', () => {
    expect(SAVE_KEY).toBe('goj-save')
  })
})
