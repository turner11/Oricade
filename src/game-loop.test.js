import { describe, it, expect } from 'vitest'
import { SCREENS, STARTING_LIVES, createGameState, start, interstitialDone, levelWon, levelFailed } from './game-loop.js'

describe('createGameState', () => {
  it('starts on the menu with the full life pool', () => {
    expect(createGameState()).toEqual({ screen: SCREENS.MENU, lives: STARTING_LIVES })
  })
})

describe('start', () => {
  it('moves from menu to the interstitial', () => {
    const state = start(createGameState())
    expect(state.screen).toBe(SCREENS.INTERSTITIAL)
    expect(state.lives).toBe(STARTING_LIVES)
  })
})

describe('interstitialDone', () => {
  it('moves from the interstitial into the level', () => {
    const state = interstitialDone(start(createGameState()))
    expect(state.screen).toBe(SCREENS.LEVEL)
  })
})

describe('levelWon', () => {
  it('moves to the victory screen without spending a life', () => {
    const state = levelWon({ screen: SCREENS.LEVEL, lives: 3 })
    expect(state).toEqual({ screen: SCREENS.VICTORY, lives: 3 })
  })
})

describe('levelFailed', () => {
  it('spends a life and restarts via the interstitial when lives remain', () => {
    const state = levelFailed({ screen: SCREENS.LEVEL, lives: 3 })
    expect(state).toEqual({ screen: SCREENS.INTERSTITIAL, lives: 2 })
  })

  it('goes to game over when the last life is spent', () => {
    const state = levelFailed({ screen: SCREENS.LEVEL, lives: 1 })
    expect(state).toEqual({ screen: SCREENS.GAME_OVER, lives: 0 })
  })
})
