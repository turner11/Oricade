export const WIN_RADIUS = 1.5
export const FAIL_Y = -5

export function hasFallenOff(playerPosition) {
  return playerPosition.y < FAIL_Y
}

export function checkLevelOutcome(playerPosition, markerPosition) {
  if (hasFallenOff(playerPosition)) return 'fail'

  const dx = playerPosition.x - markerPosition.x
  const dz = playerPosition.z - markerPosition.z
  if (Math.sqrt(dx * dx + dz * dz) < WIN_RADIUS) return 'win'

  return null
}
