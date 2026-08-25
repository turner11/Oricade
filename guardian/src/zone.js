// Phaser-free zone data: the tilemap plus pure helpers, so all of it is testable under vitest
// (no canvas/DOM). Consumed by scene.js, which is where the untestable Phaser wiring lives.

export const TILE = 32

const COLS = 40
const ROWS = 24
const SOLID = ['#', 'T', '~']

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
  return SOLID.includes(ch)
}

export function zoneSize(zone = ZONE, tile = TILE) {
  return { width: zone[0].length * tile, height: zone.length * tile }
}

export function spawnPoint(zone = ZONE, tile = TILE) {
  const row = zone.findIndex((r) => r.includes('P'))
  const col = zone[row].indexOf('P')
  return { x: col * tile + tile / 2, y: row * tile + tile / 2 }
}

// ponytail: three lines — doesn't earn its own movement.js.
export function facingFrom(vx, vy) {
  if (vx === 0 && vy === 0) return null
  return Math.abs(vx) >= Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up'
}

// ponytail: placeholder pixel art (flat color blocks, not real sprites) — swap for a real
// spritesheet in the GoJ 11 art pass. Phaser 4.2.1 dropped TextureManager#generate (this plan's
// original target); scene.js bakes these via Graphics#generateTexture instead — the documented
// fallback for that API drift. Two leg x-offsets per direction drive the walk-cycle toggle.
export const SPRITE_FRAMES = {
  up: { color: 0x3d5a80, legOffsets: [-3, 3] },
  down: { color: 0xee6c4d, legOffsets: [-3, 3] },
  left: { color: 0x8ecae6, legOffsets: [-3, 3] },
  right: { color: 0xffb703, legOffsets: [-3, 3] },
}
