import { describe, it, expect } from 'vitest'
import { formatTime, heartsFor } from './hud.js'

describe('formatTime', () => {
  it('formats whole minutes and seconds as M:SS', () => {
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(0)).toBe('0:00')
  })

  it('rounds partial seconds up so the clock never shows 0:00 while time remains', () => {
    expect(formatTime(0.4)).toBe('0:01')
    expect(formatTime(59.4)).toBe('1:00')
  })

  it('clamps negative values to 0:00', () => {
    expect(formatTime(-3)).toBe('0:00')
  })
})

describe('heartsFor', () => {
  it('renders one heart per life', () => {
    expect(heartsFor(3)).toBe('❤❤❤')
    expect(heartsFor(1)).toBe('❤')
  })

  it('renders nothing for zero or negative lives', () => {
    expect(heartsFor(0)).toBe('')
    expect(heartsFor(-1)).toBe('')
  })
})
