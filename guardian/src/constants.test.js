import { describe, it, expect } from 'vitest'
import { WIDTH, HEIGHT, TARGET_FPS } from './game-config.js'

describe('guardian game constants', () => {
  it('targets 60fps and a positive canvas size', () => {
    expect(TARGET_FPS).toBe(60)
    expect(WIDTH).toBeGreaterThan(0)
    expect(HEIGHT).toBeGreaterThan(0)
  })
})
