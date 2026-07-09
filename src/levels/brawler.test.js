import { describe, it, expect } from 'vitest'
import {
  OPPONENT_POSITION,
  OPPONENT_MAX_HEALTH,
  DAMAGE_PER_HIT,
  ATTACK_RADIUS,
  ATTACK_COOLDOWN,
  checkBrawlerOutcome,
  hudStatus,
  shouldAttack,
} from './brawler.js'

describe('checkBrawlerOutcome', () => {
  it('returns "win" once the opponent health reaches 0', () => {
    expect(checkBrawlerOutcome({ opponentHealth: 0, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBe('win')
  })

  it('returns "fail" when the player falls off, even with the opponent still healthy', () => {
    expect(checkBrawlerOutcome({ opponentHealth: OPPONENT_MAX_HEALTH, playerPosition: { x: 0, y: -10, z: 0 } })).toBe(
      'fail',
    )
  })

  it('returns null mid-fight with the player safe', () => {
    expect(checkBrawlerOutcome({ opponentHealth: 50, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBeNull()
  })
})

describe('shouldAttack', () => {
  const player = { x: OPPONENT_POSITION.x - ATTACK_RADIUS / 2, y: 0.9, z: OPPONENT_POSITION.z }

  it('is true when in range, attack pressed, and off cooldown', () => {
    expect(shouldAttack(player, OPPONENT_POSITION, true, 0)).toBe(true)
  })

  it('is false when still on cooldown', () => {
    expect(shouldAttack(player, OPPONENT_POSITION, true, ATTACK_COOLDOWN)).toBe(false)
  })

  it('is false when attack is not pressed', () => {
    expect(shouldAttack(player, OPPONENT_POSITION, false, 0)).toBe(false)
  })

  it('is false when out of range', () => {
    const farPlayer = { x: OPPONENT_POSITION.x - ATTACK_RADIUS - 5, y: 0.9, z: OPPONENT_POSITION.z }
    expect(shouldAttack(farPlayer, OPPONENT_POSITION, true, 0)).toBe(false)
  })
})

describe('config', () => {
  it('takes a whole number of hits to deplete the opponent', () => {
    expect(OPPONENT_MAX_HEALTH % DAMAGE_PER_HIT).toBe(0)
  })
})

describe('hudStatus', () => {
  it('shows the opponent health for the arcade HUD', () => {
    expect(hudStatus({ opponentHealth: 75 })).toBe(`🥊 ENEMY ${75}/${OPPONENT_MAX_HEALTH} HP`)
  })
})
