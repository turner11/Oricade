import { describe, it, expect } from 'vitest'
import { NPC_LINE, SHRINE_QUEST_TEXT, typewriterChars, questLogEntries } from './dialogue.js'

describe('typewriterChars', () => {
  it('reveals characters proportionally to elapsed time, capped at the text length', () => {
    expect(typewriterChars(0, 30, 10)).toBe(0)
    expect(typewriterChars(45, 30, 10)).toBe(1) // floor-divided, partway into char 2
    expect(typewriterChars(90, 30, 10)).toBe(3) // exact boundary: elapsedMs === msPerChar * n
    expect(typewriterChars(10000, 30, 10)).toBe(10) // past full reveal, capped at textLength
  })
})

describe('questLogEntries', () => {
  it('is empty until the player has talked to the NPC, regardless of key state', () => {
    expect(questLogEntries(false, false)).toEqual([])
    expect(questLogEntries(false, true)).toEqual([])
  })

  it('shows the shrine quest as not done once talked to, before the key is picked up', () => {
    expect(questLogEntries(true, false)).toEqual([{ text: SHRINE_QUEST_TEXT, done: false }])
  })

  it('shows the shrine quest as done once the key is held', () => {
    expect(questLogEntries(true, true)).toEqual([{ text: SHRINE_QUEST_TEXT, done: true }])
  })
})

describe('NPC_LINE', () => {
  it('is a non-empty flavor line', () => {
    expect(typeof NPC_LINE).toBe('string')
    expect(NPC_LINE.length).toBeGreaterThan(0)
  })
})
