import { describe, it, expect } from 'vitest'
import {
  GOALS_TO_WIN,
  GOAL_ZONE,
  KICK_RADIUS,
  KICK_IMPULSE,
  checkSoccerOutcome,
  isGoal,
  shouldKick,
  computeKickImpulse,
} from './soccer.js'

describe('checkSoccerOutcome', () => {
  it('returns "win" once the goal target is reached', () => {
    expect(checkSoccerOutcome({ goals: GOALS_TO_WIN, timeRemaining: 10 })).toBe('win')
  })

  it('returns "fail" when time runs out before reaching the goal target', () => {
    expect(checkSoccerOutcome({ goals: GOALS_TO_WIN - 1, timeRemaining: 0 })).toBe('fail')
  })

  it('returns null while there is time left and the target is not yet reached', () => {
    expect(checkSoccerOutcome({ goals: 1, timeRemaining: 10 })).toBeNull()
  })
})

describe('isGoal', () => {
  it('is true when the ball is inside the goal zone', () => {
    const ball = { x: GOAL_ZONE.xMin + 0.1, y: 0.3, z: 0 }
    expect(isGoal(ball, GOAL_ZONE)).toBe(true)
  })

  it('is false when the ball is short of the goal line', () => {
    const ball = { x: GOAL_ZONE.xMin - 1, y: 0.3, z: 0 }
    expect(isGoal(ball, GOAL_ZONE)).toBe(false)
  })

  it('is false when the ball is past the goal line but wide of the posts', () => {
    const ball = { x: GOAL_ZONE.xMin + 0.1, y: 0.3, z: GOAL_ZONE.zMax + 1 }
    expect(isGoal(ball, GOAL_ZONE)).toBe(false)
  })
})

describe('shouldKick', () => {
  it('is true when the player is within KICK_RADIUS of the ball and shoot is pressed', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: KICK_RADIUS / 2, y: 0.3, z: 0 }
    expect(shouldKick(player, ball, true)).toBe(true)
  })

  it('is false when shoot is not pressed', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: KICK_RADIUS / 2, y: 0.3, z: 0 }
    expect(shouldKick(player, ball, false)).toBe(false)
  })

  it('is false when the ball is out of reach', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: KICK_RADIUS + 5, y: 0.3, z: 0 }
    expect(shouldKick(player, ball, true)).toBe(false)
  })
})

describe('computeKickImpulse', () => {
  it('pushes the ball away from the player along the player-to-ball direction', () => {
    const player = { x: 0, y: 0.9, z: 0 }
    const ball = { x: 2, y: 0.3, z: 0 }
    const impulse = computeKickImpulse(player, ball, KICK_IMPULSE)
    expect(impulse.x).toBeCloseTo(KICK_IMPULSE)
    expect(impulse.z).toBeCloseTo(0)
  })
})
