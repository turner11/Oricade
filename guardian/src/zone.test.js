import { describe, it, expect } from 'vitest'
import { WIDTH, HEIGHT } from './game-config.js'
import { TILE, ZONE, isSolid, zoneSize, spawnPoint, facingFrom } from './zone.js'

describe('isSolid', () => {
  it('blocks walls, trees and water but not grass or the spawn tile', () => {
    expect(isSolid('#')).toBe(true)
    expect(isSolid('T')).toBe(true)
    expect(isSolid('~')).toBe(true)
    expect(isSolid('.')).toBe(false)
    expect(isSolid('P')).toBe(false)
  })
})

describe('the zone map', () => {
  it('is a sealed rectangle larger than the camera viewport', () => {
    const width = ZONE[0].length
    for (const row of ZONE) {
      expect(row.length).toBe(width)
    }

    for (const ch of ZONE[0]) expect(isSolid(ch)).toBe(true)
    for (const ch of ZONE[ZONE.length - 1]) expect(isSolid(ch)).toBe(true)
    for (const row of ZONE) {
      expect(isSolid(row[0])).toBe(true)
      expect(isSolid(row[row.length - 1])).toBe(true)
    }

    const size = zoneSize()
    expect(size.width).toBeGreaterThan(WIDTH)
    expect(size.height).toBeGreaterThan(HEIGHT)

    expect(ZONE.some((row) => row.includes('T'))).toBe(true)
    expect(ZONE.some((row) => row.includes('~'))).toBe(true)
  })
})

describe('spawnPoint', () => {
  it('returns the pixel centre of the one walkable spawn tile', () => {
    let spawnCount = 0
    let spawnRow = -1
    let spawnCol = -1
    ZONE.forEach((row, r) => {
      const c = row.indexOf('P')
      if (c !== -1) {
        spawnCount += 1
        spawnRow = r
        spawnCol = c
      }
    })
    expect(spawnCount).toBe(1)

    const point = spawnPoint()
    expect(point.x).toBe(spawnCol * TILE + TILE / 2)
    expect(point.y).toBe(spawnRow * TILE + TILE / 2)
    expect(isSolid('P')).toBe(false)
  })
})

describe('facingFrom', () => {
  it('maps velocity to a walk direction and to null when standing still', () => {
    expect(facingFrom(0, -1)).toBe('up')
    expect(facingFrom(0, 1)).toBe('down')
    expect(facingFrom(-1, 0)).toBe('left')
    expect(facingFrom(1, 0)).toBe('right')
    expect(facingFrom(1, -1)).toBe('right')
    expect(facingFrom(0, 0)).toBe(null)
  })
})
