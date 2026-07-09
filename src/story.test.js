import { describe, it, expect } from 'vitest'
import { GAME_TITLE, GAME_TAGLINE, HERO, getStoryLine } from './story.js'
import { LEVELS } from './levels/registry.js'

describe('game story', () => {
  it('has a title and a kid-friendly tagline', () => {
    expect(GAME_TITLE).toBe('Oricade')
    expect(GAME_TAGLINE.length).toBeGreaterThan(0)
  })

  it('has a named hero for players to root for', () => {
    expect(HERO.name.length).toBeGreaterThan(0)
    expect(HERO.description.length).toBeGreaterThan(0)
  })
})

describe('getStoryLine', () => {
  it('returns a non-empty plot line for every level', () => {
    LEVELS.forEach((_, i) => {
      expect(getStoryLine(i).length).toBeGreaterThan(0)
    })
  })

  it('gives each level its own plot line', () => {
    const lines = LEVELS.map((_, i) => getStoryLine(i))
    expect(new Set(lines).size).toBe(LEVELS.length)
  })

  it('mentions the hero by name so kids can follow the plot', () => {
    LEVELS.forEach((_, i) => {
      expect(getStoryLine(i)).toContain(HERO.name)
    })
  })
})
