import { describe, it, expect } from 'vitest'
import { TYPEWRITER_MS_PER_CHAR } from './game-config.js'
import { facingFrom } from './zone.js'
import {
  KEY_ACTIONS,
  defaultSettings,
  mergeSettings,
  isValidKeyName,
  keyNameFromEvent,
  stickVector,
} from './settings.js'

describe('defaultSettings', () => {
  it('has a binding for every action, a positive text speed, and audible unmuted defaults', () => {
    const settings = defaultSettings()
    for (const action of KEY_ACTIONS) {
      expect(typeof settings.keys[action]).toBe('string')
    }
    expect(settings.textSpeed).toBe(TYPEWRITER_MS_PER_CHAR)
    expect(settings.textSpeed).toBeGreaterThan(0)
    expect(settings.volume).toBe(1)
    expect(settings.muted).toBe(false)
  })
})

describe('isValidKeyName', () => {
  it('rejects digit key names — Phaser has ZERO..NINE, not "0".."9", so addKey would go dead', () => {
    expect(isValidKeyName('5')).toBe(false)
    expect(isValidKeyName('0')).toBe(false)
    expect(isValidKeyName('K')).toBe(true)
  })
})

describe('mergeSettings', () => {
  it('fills in every field from an empty/garbage blob', () => {
    for (const raw of [undefined, null, 'not an object', {}]) {
      expect(mergeSettings(raw)).toEqual(defaultSettings())
    }
  })

  it('rejects only the invalid binding, keeping valid siblings', () => {
    const merged = mergeSettings({ keys: { up: 'K', down: 'F13', left: 42 } })
    const defaults = defaultSettings()
    expect(merged.keys.up).toBe('K')
    expect(merged.keys.down).toBe(defaults.keys.down)
    expect(merged.keys.left).toBe(defaults.keys.left)
    expect(merged.keys.right).toBe(defaults.keys.right)
    expect(merged.keys.attack).toBe(defaults.keys.attack)
    expect(merged.keys.dash).toBe(defaults.keys.dash)
  })

  it('clamps volume and rejects a non-positive or non-finite text speed', () => {
    expect(mergeSettings({ volume: 5 }).volume).toBe(1)
    expect(mergeSettings({ volume: -1 }).volume).toBe(0)
    expect(mergeSettings({ volume: 'loud' }).volume).toBe(defaultSettings().volume)

    expect(mergeSettings({ textSpeed: 0 }).textSpeed).toBe(defaultSettings().textSpeed)
    expect(mergeSettings({ textSpeed: -30 }).textSpeed).toBe(defaultSettings().textSpeed)
    expect(mergeSettings({ textSpeed: NaN }).textSpeed).toBe(defaultSettings().textSpeed)
    expect(mergeSettings({ textSpeed: '30' }).textSpeed).toBe(defaultSettings().textSpeed)
    expect(mergeSettings({ textSpeed: 5 }).textSpeed).toBe(5)

    expect(mergeSettings({ muted: 'yes' }).muted).toBe(false)
    expect(mergeSettings({ muted: true }).muted).toBe(true)
  })
})

describe('keyNameFromEvent', () => {
  it('maps a KeyboardEvent to a Phaser key name, or null when unbindable', () => {
    expect(keyNameFromEvent({ key: ' ' })).toBe('SPACE')
    expect(keyNameFromEvent({ key: 'Shift' })).toBe('SHIFT')
    expect(keyNameFromEvent({ key: 'Control' })).toBe('CTRL')
    expect(keyNameFromEvent({ key: 'Alt' })).toBe('ALT')
    expect(keyNameFromEvent({ key: 'Enter' })).toBe('ENTER')
    expect(keyNameFromEvent({ key: 'Tab' })).toBe('TAB')
    expect(keyNameFromEvent({ key: 'ArrowUp' })).toBe('UP')
    expect(keyNameFromEvent({ key: 'ArrowDown' })).toBe('DOWN')
    expect(keyNameFromEvent({ key: 'ArrowLeft' })).toBe('LEFT')
    expect(keyNameFromEvent({ key: 'ArrowRight' })).toBe('RIGHT')
    expect(keyNameFromEvent({ key: 'k' })).toBe('K')
    expect(keyNameFromEvent({ key: 'F13' })).toBe(null)
    expect(keyNameFromEvent({ key: 'Dead' })).toBe(null)
  })
})

describe('stickVector', () => {
  it('is dead inside the deadzone, clamped at the rim, and feeds facingFrom', () => {
    const radius = 50
    expect(stickVector(2, 2, radius)).toEqual({ x: 0, y: 0 })

    const far = stickVector(500, 0, radius)
    const mag = Math.hypot(far.x, far.y)
    expect(mag).toBeCloseTo(1)

    const down = stickVector(0, 100, radius)
    expect(facingFrom(down.x, down.y)).toBe('down')
  })
})
