import { describe, it, expect } from 'vitest'
import { P1_KEYS, P2_KEYS, keysToState, gamepadToState, mergeStates, computeInputState } from './input.js'

function fakeGamepad({ axes = [0, 0], buttons = {} } = {}) {
  const b = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
  for (const [i, v] of Object.entries(buttons)) b[i] = { pressed: true, value: v ?? 1 }
  return { axes, buttons: b }
}

describe('keysToState', () => {
  it('maps P1 WASD/Space/F/Shift/E to move+jump+shoot+crouch+magic', () => {
    const pressed = new Set(['KeyW', 'KeyD', 'Space', 'KeyF', 'ShiftLeft', 'KeyE'])
    expect(keysToState(pressed, P1_KEYS)).toEqual({
      move: { x: 1, y: 1 },
      jump: true,
      shoot: true,
      crouch: true,
      magic: true,
    })
  })

  it('maps P2 arrows/numpad to move+jump+shoot+crouch+magic', () => {
    const pressed = new Set(['ArrowLeft', 'ArrowDown', 'Numpad0', 'Numpad1', 'ControlRight', 'Numpad2'])
    expect(keysToState(pressed, P2_KEYS)).toEqual({
      move: { x: -1, y: -1 },
      jump: true,
      shoot: true,
      crouch: true,
      magic: true,
    })
  })

  it('returns all-false/zero state when nothing is pressed', () => {
    expect(keysToState(new Set(), P1_KEYS)).toEqual({
      move: { x: 0, y: 0 },
      jump: false,
      shoot: false,
      crouch: false,
      magic: false,
    })
  })
})

describe('gamepadToState', () => {
  it('reads face buttons and trigger per the SPEC mapping', () => {
    const gp = fakeGamepad({ buttons: { 0: 1, 2: 1, 3: 1, 6: 1 } })
    expect(gamepadToState(gp)).toEqual({
      move: { x: 0, y: 0 },
      jump: true,
      shoot: true,
      crouch: true,
      magic: true,
    })
  })

  it('reads the left analog stick for move, ignoring small deadzone noise', () => {
    const gp = fakeGamepad({ axes: [0.05, -1] })
    expect(gamepadToState(gp).move).toEqual({ x: 0, y: 1 })
  })

  it('returns a neutral state for a null gamepad (not connected)', () => {
    expect(gamepadToState(null)).toEqual({
      move: { x: 0, y: 0 },
      jump: false,
      shoot: false,
      crouch: false,
      magic: false,
    })
  })
})

describe('mergeStates', () => {
  it('OR-combines booleans and clamps combined move to [-1, 1]', () => {
    const a = { move: { x: 1, y: 0 }, jump: true, shoot: false, crouch: false, magic: false }
    const b = { move: { x: 1, y: -1 }, jump: false, shoot: true, crouch: false, magic: false }
    expect(mergeStates(a, b)).toEqual({
      move: { x: 1, y: -1 },
      jump: true,
      shoot: true,
      crouch: false,
      magic: false,
    })
  })
})

describe('computeInputState', () => {
  it('combines keyboard and gamepad input per player into { p1, p2 }', () => {
    const pressed = new Set(['KeyW'])
    const gamepads = [null, fakeGamepad({ buttons: { 0: 1 } })]
    const state = computeInputState(pressed, gamepads)
    expect(state.p1.move).toEqual({ x: 0, y: 1 })
    expect(state.p2.jump).toBe(true)
  })
})
