import { describe, it, expect } from 'vitest'
import { SCREENS, STARTING_LIVES, createGameState, start, interstitialDone, levelWon, levelFailed, selectLevel } from './game-loop.js'

describe('createGameState', () => {
  it('starts on the menu with the full life pool and the first level', () => {
    expect(createGameState()).toEqual({ screen: SCREENS.MENU, lives: STARTING_LIVES, levelIndex: 0 })
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
  it('advances to the next level via the interstitial when more levels remain', () => {
    const state = levelWon({ screen: SCREENS.LEVEL, lives: 3, levelIndex: 0 }, 2)
    expect(state).toEqual({ screen: SCREENS.INTERSTITIAL, lives: 3, levelIndex: 1 })
  })

  it('moves to the victory screen after winning the last level', () => {
    const state = levelWon({ screen: SCREENS.LEVEL, lives: 3, levelIndex: 1 }, 2)
    expect(state).toEqual({ screen: SCREENS.VICTORY, lives: 3, levelIndex: 1 })
  })
})

describe('selectLevel', () => {
  it('jumps straight to the chosen level via the interstitial, preserving lives', () => {
    const state = selectLevel({ screen: SCREENS.LEVEL, lives: 2, levelIndex: 0 }, 5)
    expect(state).toEqual({ screen: SCREENS.INTERSTITIAL, lives: 2, levelIndex: 5 })
  })

  it('works from any screen (menu, game over, victory)', () => {
    expect(selectLevel({ screen: SCREENS.GAME_OVER, lives: 0, levelIndex: 3 }, 1)).toEqual({
      screen: SCREENS.INTERSTITIAL,
      lives: 0,
      levelIndex: 1,
    })
  })
})

describe('levelFailed', () => {
  it('spends a life and restarts the same level via the interstitial when lives remain', () => {
    const state = levelFailed({ screen: SCREENS.LEVEL, lives: 3, levelIndex: 1 })
    expect(state).toEqual({ screen: SCREENS.INTERSTITIAL, lives: 2, levelIndex: 1 })
  })

  it('goes to game over when the last life is spent', () => {
    const state = levelFailed({ screen: SCREENS.LEVEL, lives: 1, levelIndex: 0 })
    expect(state).toEqual({ screen: SCREENS.GAME_OVER, lives: 0, levelIndex: 0 })
  })
})
