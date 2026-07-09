export const SHAKE_DURATION = 0.3
export const SHAKE_INTENSITY = 0.15

export function computeShakeOffset(elapsed, duration = SHAKE_DURATION, intensity = SHAKE_INTENSITY) {
  if (elapsed >= duration) return { x: 0, y: 0, z: 0 }
  const decay = 1 - elapsed / duration
  return {
    x: intensity * decay * Math.sin(elapsed * 53),
    y: intensity * decay * Math.cos(elapsed * 47),
    z: 0,
  }
}

let shakeElapsed = SHAKE_DURATION

export function triggerShake() {
  shakeElapsed = 0
}

export function tickShake(dt) {
  shakeElapsed = Math.min(shakeElapsed + dt, SHAKE_DURATION)
  return computeShakeOffset(shakeElapsed)
}
