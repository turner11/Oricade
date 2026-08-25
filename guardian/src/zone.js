// Phaser-free zone data: the tilemap plus pure helpers, so all of it is testable under vitest
// (no canvas/DOM). Consumed by scene.js, which is where the untestable Phaser wiring lives.

export const TILE = 32

const COLS = 40
const ROWS = 24

// Canonical solid-tile vocabulary: char -> placeholder color. isSolid() and scene.js's rectangle
// fill both derive from this one map instead of hand-keeping their own copies of the tile list.
export const TILE_COLOR = { '#': 0x4a4a4a, T: 0x2d5a27, '~': 0x1f4e79 }

function buildZone() {
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill('.'))

  for (let c = 0; c < COLS; c++) {
    grid[0][c] = '#'
    grid[ROWS - 1][c] = '#'
  }
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = '#'
    grid[r][COLS - 1] = '#'
  }

  for (let c = 10; c <= 14; c++) grid[6][c] = '#' // internal wall segment
  for (let c = 20; c <= 25; c++) grid[10][c] = 'T' // tree line
  for (let r = 14; r <= 16; r++) {
    for (let c = 5; c <= 9; c++) grid[r][c] = '~' // water pond
  }
  grid[3][3] = 'P' // spawn

  return grid.map((row) => row.join(''))
}

export const ZONE = buildZone()

export function isSolid(ch) {
  return Object.keys(TILE_COLOR).includes(ch)
}

export function zoneSize() {
  return { width: ZONE[0].length * TILE, height: ZONE.length * TILE }
}

export function spawnPoint() {
  const row = ZONE.findIndex((r) => r.includes('P'))
  const col = ZONE[row].indexOf('P')
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 }
}

// ponytail: three lines — doesn't earn its own movement.js.
export function facingFrom(vx, vy) {
  if (vx === 0 && vy === 0) return null
  return Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up'
}
