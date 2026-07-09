const MECHANIC_LABELS = {
  move: 'Move',
  jump: 'Jump',
  shoot: 'Shoot',
  crouch: 'Crouch',
  magic: 'Magic Spell',
}

export const LEVELS = [
  {
    id: 1,
    theme: 'Foundation Test',
    perspective: 'Free-roam (debug)',
    objective: 'Reach the golden marker',
    mechanics: ['move', 'jump', 'crouch'],
    markerPosition: { x: 10, y: 0.5, z: 0 },
  },
]

export function getLevel(index = 0) {
  return LEVELS[index]
}

export function describeMechanics(mechanics) {
  return mechanics.map((m) => MECHANIC_LABELS[m]).join(' / ')
}
