import { describe, it, expect } from 'vitest'
import { WIDTH, HEIGHT } from './game-config.js'
import {
  TILE,
  ZONES,
  isSolid,
  isWarp,
  zoneSize,
  spawnPoint,
  facingFrom,
  doorPosition,
  keyPosition,
  npcPosition,
  warpPosition,
  tileAt,
} from './zone.js'

describe('isSolid', () => {
  it('blocks walls, trees and water but not grass or the spawn tile', () => {
    expect(isSolid('#')).toBe(true)
    expect(isSolid('T')).toBe(true)
    expect(isSolid('~')).toBe(true)
    expect(isSolid('.')).toBe(false)
    expect(isSolid('P')).toBe(false)
  })
})

describe('isWarp', () => {
  it('flags the forward and backward warp tiles only', () => {
    expect(isWarp('E')).toBe(true)
    expect(isWarp('B')).toBe(true)
    expect(isWarp('.')).toBe(false)
    expect(isWarp('#')).toBe(false)
  })
})

function findAll(zone, ch) {
  const hits = []
  zone.forEach((row, r) => {
    let c = row.indexOf(ch)
    while (c !== -1) {
      hits.push({ row: r, col: c })
      c = row.indexOf(ch, c + 1)
    }
  })
  return hits
}

describe('the zone maps', () => {
  it('has three zones, each a sealed rectangle with exactly one spawn tile', () => {
    expect(ZONES.length).toBe(3)

    ZONES.forEach((zone, z) => {
      const width = zone[0].length
      for (const row of zone) expect(row.length).toBe(width)

      for (const ch of zone[0]) expect(isSolid(ch)).toBe(true)
      for (const ch of zone[zone.length - 1]) expect(isSolid(ch)).toBe(true)
      for (const row of zone) {
        expect(isSolid(row[0])).toBe(true)
        expect(isSolid(row[row.length - 1])).toBe(true)
      }

      const size = zoneSize(z)
      expect(size.width).toBeGreaterThan(WIDTH)
      expect(size.height).toBeGreaterThan(HEIGHT)

      expect(findAll(zone, 'P').length).toBe(1)
    })
  })
})

describe('zone transitions link up', () => {
  it('every forward warp has a matching backward warp in the next zone, ends are unwarped, and warps sit off the border', () => {
    ZONES.forEach((zone, z) => {
      const forward = findAll(zone, 'E')
      const backward = findAll(zone, 'B')

      if (z === 0) expect(backward.length).toBe(0)
      if (z === ZONES.length - 1) expect(forward.length).toBe(0)

      if (forward.length > 0) {
        expect(findAll(ZONES[z + 1], 'B').length).toBe(1)
      }

      for (const hit of [...forward, ...backward]) {
        const ch = zone[hit.row][hit.col]
        expect(isSolid(ch)).toBe(false)
        expect(hit.row).toBeGreaterThan(0)
        expect(hit.row).toBeLessThan(zone.length - 1)
        expect(hit.col).toBeGreaterThan(0)
        expect(hit.col).toBeLessThan(zone[0].length - 1)
      }
    })
  })
})

describe('tileAt', () => {
  it('returns the tile char at a given pixel in the given zone', () => {
    expect(tileAt(0, 38 * TILE + TILE / 2, 12 * TILE + TILE / 2)).toBe('E')
    expect(tileAt(1, 1 * TILE + TILE / 2, 12 * TILE + TILE / 2)).toBe('B')
    expect(tileAt(2, 1 * TILE + TILE / 2, 12 * TILE + TILE / 2)).toBe('B')
  })
})

describe('spawnPoint', () => {
  it('returns the pixel centre of the one walkable spawn tile per zone', () => {
    ZONES.forEach((zone, z) => {
      const [spawn] = findAll(zone, 'P')
      const point = spawnPoint(z)
      expect(point.x).toBe(spawn.col * TILE + TILE / 2)
      expect(point.y).toBe(spawn.row * TILE + TILE / 2)
    })
    expect(isSolid('P')).toBe(false)
  })
})

describe('doorPosition', () => {
  it('returns the pixel centre of the shrine-door tile in zone 0 and zone 1', () => {
    for (const z of [0, 1]) {
      const [door] = findAll(ZONES[z], 'D')
      const point = doorPosition(z)
      expect(point.x).toBe(door.col * TILE + TILE / 2)
      expect(point.y).toBe(door.row * TILE + TILE / 2)
      expect(isSolid('D')).toBe(false)
    }
  })

  it('returns null for a zone with no door tile', () => {
    expect(doorPosition(2)).toBe(null)
  })
})

describe('position helpers return null for tiles absent from a zone', () => {
  it('keyPosition and npcPosition are zone-1-only', () => {
    expect(keyPosition(0)).not.toBe(null)
    expect(npcPosition(0)).not.toBe(null)
    expect(keyPosition(1)).toBe(null)
    expect(npcPosition(1)).toBe(null)
    expect(keyPosition(2)).toBe(null)
    expect(npcPosition(2)).toBe(null)
  })
})

describe('warpPosition', () => {
  it('returns the pixel centre of the requested warp tile', () => {
    const point = warpPosition(0, 'E')
    expect(point.x).toBe(38 * TILE + TILE / 2)
    expect(point.y).toBe(12 * TILE + TILE / 2)
    expect(warpPosition(0, 'B')).toBe(null)
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
