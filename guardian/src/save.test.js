import { describe, it, expect } from 'vitest'
import { PLAYER_MAX_HP } from './game-config.js'
import { ZONES, spawnPoint } from './zone.js'
import { defaultSettings } from './settings.js'
import { SAVE_KEY, SAVE_VERSION, defaultState, serialize, deserialize } from './save.js'

describe('defaultState', () => {
  it('starts fresh in zone 0 at the spawn point with full HP, an empty inventory, and no NPC talked to', () => {
    const state = defaultState()
    expect(state.zone).toBe(0)
    expect(state.player).toEqual({ ...spawnPoint(0), hp: PLAYER_MAX_HP })
    expect(state.inventory).toEqual([])
    expect(state.talkedToNpc).toBe(false)
    expect(state.skills).toEqual([])
    expect(state.settings).toEqual(defaultSettings())
  })
})

describe('serialize/deserialize', () => {
  it('round-trips a valid state', () => {
    const state = defaultState()
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('round-trips a state with talkedToNpc: true', () => {
    const state = { ...defaultState(), talkedToNpc: true }
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('rejects corrupt JSON', () => {
    expect(deserialize('{not json')).toBe(null)
  })

  it('rejects a save missing player or inventory fields', () => {
    expect(deserialize(JSON.stringify({ version: SAVE_VERSION }))).toBe(null)
    expect(
      deserialize(
        JSON.stringify({
          version: SAVE_VERSION,
          player: { x: 0, y: 0, hp: 3 },
          talkedToNpc: false,
        })
      )
    ).toBe(null)
    expect(
      deserialize(JSON.stringify({ version: SAVE_VERSION, inventory: [], talkedToNpc: false }))
    ).toBe(null)
  })

  it('rejects a save missing talkedToNpc', () => {
    expect(
      deserialize(
        JSON.stringify({
          version: SAVE_VERSION,
          player: { x: 0, y: 0, hp: 3 },
          inventory: [],
          zone: 0,
        })
      )
    ).toBe(null)
  })

  it('rejects a mismatched schema version', () => {
    expect(
      deserialize(
        JSON.stringify({
          version: 999,
          player: { x: 0, y: 0, hp: 3 },
          inventory: [],
          talkedToNpc: false,
          zone: 0,
        })
      )
    ).toBe(null)
  })

  it('round-trips the current zone', () => {
    const state = { ...defaultState(), zone: 2 }
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('defaults zone to 0 when it is not a real zone index', () => {
    const base = {
      version: SAVE_VERSION,
      player: { x: 0, y: 0, hp: 3 },
      inventory: [],
      talkedToNpc: false,
    }
    const expected = {
      player: base.player,
      inventory: base.inventory,
      talkedToNpc: false,
      zone: 0,
      skills: [],
      settings: defaultSettings(),
    }
    expect(deserialize(JSON.stringify(base))).toEqual(expected)
    expect(deserialize(JSON.stringify({ ...base, zone: '0' }))).toEqual(expected)
    // Out of range / fractional: zoneSize() would throw at boot on every reload otherwise.
    for (const zone of [ZONES.length, 99, -1, 1.5]) {
      expect(deserialize(JSON.stringify({ ...base, zone }))).toEqual(expected)
    }
  })

  it('loads an old v2 save (pre-dating zones), defaulting zone to 0', () => {
    const restored = deserialize(
      JSON.stringify({
        version: 2,
        player: { x: 0, y: 0, hp: 3 },
        inventory: [],
        talkedToNpc: false,
      })
    )
    expect(restored).toEqual({
      zone: 0,
      player: { x: 0, y: 0, hp: 3 },
      inventory: [],
      talkedToNpc: false,
      skills: [],
      settings: defaultSettings(),
    })
  })

  it('round-trips unlocked skills', () => {
    const state = { ...defaultState(), skills: ['dash'] }
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('a v3 save (pre-dating skills) loads with no skills', () => {
    const base = {
      version: 3,
      player: { x: 0, y: 0, hp: 3 },
      inventory: [],
      talkedToNpc: false,
      zone: 0,
    }
    expect(deserialize(JSON.stringify(base)).skills).toEqual([])
    expect(deserialize(JSON.stringify({ ...base, skills: 'not-an-array' })).skills).toEqual([])
    expect(deserialize(JSON.stringify({ ...base, skills: null })).skills).toEqual([])
  })

  it('round-trips settings', () => {
    const state = {
      ...defaultState(),
      settings: { ...defaultSettings(), muted: true, textSpeed: 5 },
    }
    const restored = deserialize(serialize(state))
    expect(restored).toEqual(state)
  })

  it('a v4 save (pre-dating settings) loads with default settings', () => {
    const base = {
      version: 4,
      player: { x: 0, y: 0, hp: 3 },
      inventory: [],
      talkedToNpc: false,
      zone: 0,
      skills: [],
    }
    expect(deserialize(JSON.stringify(base)).settings).toEqual(defaultSettings())
    expect(deserialize(JSON.stringify({ ...base, settings: 'nope' })).settings).toEqual(
      defaultSettings()
    )
    expect(deserialize(JSON.stringify({ ...base, settings: null })).settings).toEqual(
      defaultSettings()
    )
  })
})

describe('SAVE_KEY', () => {
  it('is a stable localStorage key', () => {
    expect(SAVE_KEY).toBe('goj-save')
  })
})
