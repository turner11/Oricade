export const SCREENS = {
  MENU: 'menu',
  INTERSTITIAL: 'interstitial',
  LEVEL: 'level',
  GAME_OVER: 'gameover',
  VICTORY: 'victory',
}

export const STARTING_LIVES = 3

export function createGameState() {
  return { screen: SCREENS.MENU, lives: STARTING_LIVES }
}

export function start(state) {
  return { ...state, screen: SCREENS.INTERSTITIAL }
}

export function interstitialDone(state) {
  return { ...state, screen: SCREENS.LEVEL }
}

export function levelWon(state) {
  return { ...state, screen: SCREENS.VICTORY }
}

export function levelFailed(state) {
  const lives = state.lives - 1
  return lives > 0
    ? { ...state, lives, screen: SCREENS.INTERSTITIAL }
    : { ...state, lives: 0, screen: SCREENS.GAME_OVER }
}
