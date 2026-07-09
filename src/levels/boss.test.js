import { describe, it, expect } from 'vitest'
import {
  PHASE_COUNT,
  PHASES,
  BOSS_POSITION,
  STRIKE_RADIUS,
  AIRBORNE_THRESHOLD,
  checkBossOutcome,
  hudStatus,
  PHASE_MAX_HEALTH,
  canDamagePhase,
  shouldStrike,
} from './boss.js'

describe('PHASES', () => {
  it('has one entry per phase, each with a required mechanic and dialogue', () => {
    expect(PHASES.length).toBe(PHASE_COUNT)
    for (const phase of PHASES) {
      expect(['shoot', 'jump', 'magic']).toContain(phase.requiredMechanic)
      expect(typeof phase.dialogue).toBe('string')
      expect(phase.dialogue.length).toBeGreaterThan(0)
    }
  })

  it('uses a different required mechanic per phase (mashup gag)', () => {
    const mechanics = new Set(PHASES.map((p) => p.requiredMechanic))
    expect(mechanics.size).toBe(PHASE_COUNT)
  })
})

describe('checkBossOutcome', () => {
  it('returns "win" once every phase is cleared', () => {
    expect(checkBossOutcome({ phaseIndex: PHASE_COUNT, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBe('win')
  })

  it('returns "fail" when the player falls off, mid-fight', () => {
    expect(checkBossOutcome({ phaseIndex: 1, playerPosition: { x: 0, y: -10, z: 0 } })).toBe('fail')
  })

  it('returns null while phases remain and the player is safe', () => {
    expect(checkBossOutcome({ phaseIndex: 1, playerPosition: { x: 0, y: 0.9, z: 0 } })).toBeNull()
  })
})

describe('canDamagePhase', () => {
  const grounded = { x: 0, y: 0.9, z: 0 }
  const airborne = { x: 0, y: AIRBORNE_THRESHOLD + 0.1, z: 0 }

  it('the "shoot" phase only needs shoot pressed', () => {
    const phase = PHASES.find((p) => p.requiredMechanic === 'shoot')
    expect(canDamagePhase(phase, { shoot: true, magic: false }, grounded)).toBe(true)
    expect(canDamagePhase(phase, { shoot: false, magic: false }, grounded)).toBe(false)
  })

  it('the "jump" phase needs shoot pressed AND the player airborne', () => {
    const phase = PHASES.find((p) => p.requiredMechanic === 'jump')
    expect(canDamagePhase(phase, { shoot: true, magic: false }, airborne)).toBe(true)
    expect(canDamagePhase(phase, { shoot: true, magic: false }, grounded)).toBe(false)
  })

  it('the "magic" phase only needs magic pressed', () => {
    const phase = PHASES.find((p) => p.requiredMechanic === 'magic')
    expect(canDamagePhase(phase, { shoot: false, magic: true }, grounded)).toBe(true)
    expect(canDamagePhase(phase, { shoot: false, magic: false }, grounded)).toBe(false)
  })
})

describe('shouldStrike', () => {
  const phase = PHASES.find((p) => p.requiredMechanic === 'shoot')
  const nearPlayer = { x: BOSS_POSITION.x - STRIKE_RADIUS / 2, y: 0.9, z: BOSS_POSITION.z }
  const farPlayer = { x: BOSS_POSITION.x - STRIKE_RADIUS - 5, y: 0.9, z: BOSS_POSITION.z }

  it('is true when in range, mechanic satisfied, and off cooldown', () => {
    expect(shouldStrike(nearPlayer, BOSS_POSITION, phase, { shoot: true, magic: false }, 0)).toBe(true)
  })

  it('is false on cooldown', () => {
    expect(shouldStrike(nearPlayer, BOSS_POSITION, phase, { shoot: true, magic: false }, 0.3)).toBe(false)
  })

  it('is false out of range', () => {
    expect(shouldStrike(farPlayer, BOSS_POSITION, phase, { shoot: true, magic: false }, 0)).toBe(false)
  })
})

describe('hudStatus', () => {
  it('shows the current phase and boss health for the arcade HUD', () => {
    expect(hudStatus({ phaseIndex: 0, phaseHealth: 40 })).toBe(`👑 PHASE 1/${PHASE_COUNT} · BOSS 40/${PHASE_MAX_HEALTH}`)
  })
})
