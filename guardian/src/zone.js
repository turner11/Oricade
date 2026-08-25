// Phaser-free zone data: the tilemap plus pure helpers, so all of it is testable under vitest
// (no canvas/DOM). Consumed by scene.js, which is where the untestable Phaser wiring lives.

export const TILE = 32

const COLS = 40
const ROWS = 24

// Canonical solid-tile vocabulary: char -> placeholder color. isSolid() and scene.js's rectangle
// fill both derive from this one map instead of hand-keeping their own copies of the tile list.
export const TILE_COLOR = { '#': 0x4a4a4a, T: 0x2d5a27, '~': 0x1f4e79 }

// Inventory item id for the shrine key pickup. Deliberately not in TILE_COLOR: 'D'/'K' stay
// non-solid in the generic wall loop so scene.js gates the door dynamically (locked = solid
// body added at runtime, unlocked = the tile is already open floor). 'E'/'B' (zone warps) are
// non-solid for the same reason — see isWarp().
export const SHRINE_KEY = 'shrine-key'

function emptyGrid() {
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'))

  for (let c = 0; c < COLS; c++) {
    grid[0][c] = '#'
    grid[ROWS - 1][c] = '#'
  }
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = '#'
    grid[r][COLS - 1] = '#'
  }

  return grid
}

// Zone 1 (index 0): the original vertical-slice map, untouched apart from the 'E' warp to zone 2.
function buildZone1() {
  const grid = emptyGrid()

  for (let c = 10; c <= 14; c++) grid[6][c] = '#' // internal wall segment
  for (let c = 20; c <= 25; c++) grid[10][c] = 'T' // tree line
  for (let r = 14; r <= 16; r++) {
    for (let c = 5; c <= 9; c++) grid[r][c] = '~' // water pond
  }
  grid[3][3] = 'P' // spawn
  grid[2][6] = 'K' // shrine key, open field
  grid[5][15] = 'N' // NPC, open field clear of walls/tree line/pond/shrine/Zane patrol
  grid[12][38] = 'E' // warp to zone 2, one tile inside the east wall

  // Shrine room: 6x5 walled rectangle with a single door gap in the bottom wall.
  for (let c = 30; c <= 35; c++) {
    grid[17][c] = '#'
    grid[21][c] = '#'
  }
  for (let r = 17; r <= 21; r++) {
    grid[r][30] = '#'
    grid[r][35] = '#'
  }
  grid[21][32] = 'D' // door gap

  return grid.map((row) => row.join(''))
}

// Zone 2 (index 1): water/garden. Ember guards the shrine door; Stormy sits by the pond.
function buildZone2() {
  const grid = emptyGrid()

  grid[12][1] = 'B' // warp back to zone 1, one tile inside the west wall
  grid[12][2] = 'P' // spawn, beside the back-warp
  grid[12][38] = 'E' // warp to zone 3

  for (let r = 14; r <= 16; r++) {
    for (let c = 20; c <= 24; c++) grid[r][c] = '~' // pond
  }

  // Shrine room, same shape as zone 1's — this one guarded by Ember instead of a key.
  for (let c = 30; c <= 35; c++) {
    grid[17][c] = '#'
    grid[21][c] = '#'
  }
  for (let r = 17; r <= 21; r++) {
    grid[r][30] = '#'
    grid[r][35] = '#'
  }
  grid[21][32] = 'D' // door gap

  return grid.map((row) => row.join(''))
}

// Zone 3 (index 2): night gauntlet. A few wall segments for line-of-sight cover; no forward warp
// — this is the last zone in the v1 roster.
function buildZone3() {
  const grid = emptyGrid()

  grid[12][1] = 'B' // warp back to zone 2
  grid[12][2] = 'P' // spawn, beside the back-warp

  for (let c = 8; c <= 12; c++) grid[8][c] = '#'
  for (let c = 20; c <= 24; c++) grid[16][c] = '#'
  for (let r = 5; r <= 9; r++) grid[r][30] = '#'

  return grid.map((row) => row.join(''))
}

export const ZONES = [buildZone1(), buildZone2(), buildZone3()]

export function isSolid(ch) {
  return Object.keys(TILE_COLOR).includes(ch)
}

export function isWarp(ch) {
  return ch === 'E' || ch === 'B'
}

export function zoneSize(z) {
  const zone = ZONES[z]
  return { width: zone[0].length * TILE, height: zone.length * TILE }
}

// Pixel centre of the one tile matching `ch` in the given zone, or null if that zone has no such
// tile (zones 2/3 have no 'K'/'N'; zone 3 has no 'D'; only some zones have 'E'/'B'). Callers must
// handle null. spawnPoint/doorPosition/keyPosition/npcPosition/warpPosition are all "find the
// tile, then convert grid coords to pixels" — this is that lookup, shared.
function tilePosition(zone, ch) {
  const row = zone.findIndex((r) => r.includes(ch))
  if (row === -1) return null
  const col = zone[row].indexOf(ch)
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }
}

export function spawnPoint(z) {
  return tilePosition(ZONES[z], 'P')
}

export function doorPosition(z) {
  return tilePosition(ZONES[z], 'D')
}

export function keyPosition(z) {
  return tilePosition(ZONES[z], 'K')
}

export function npcPosition(z) {
  return tilePosition(ZONES[z], 'N')
}

export function warpPosition(z, ch) {
  return tilePosition(ZONES[z], ch)
}

// Pixel -> tile char, used to detect the player stepping onto a warp tile.
export function tileAt(z, x, y) {
  return ZONES[z][Math.floor(y / TILE)][Math.floor(x / TILE)]
}

// ponytail: three lines — doesn't earn its own movement.js.
export function facingFrom(vx, vy) {
  if (vx === 0 && vy === 0) return null
  return Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up'
}
