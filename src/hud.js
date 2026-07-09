// Rounds up so the clock never reads 0:00 while any time remains.
export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function heartsFor(lives) {
  return '❤'.repeat(Math.max(0, lives))
}
