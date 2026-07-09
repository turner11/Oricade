import { createRuntime as createPlaceholderRuntime } from './placeholder.js'
import { createRuntime as createSoccerRuntime } from './soccer.js'
import { createRuntime as createBasketballRuntime } from './basketball.js'
import { createRuntime as createPlatformerRuntime } from './platformer.js'

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
    createRuntime: createPlaceholderRuntime,
  },
  {
    id: 2,
    theme: 'Soccer',
    perspective: 'Third-person (Isometric)',
    objective: 'Score 3 goals before time expires',
    mechanics: ['move', 'shoot'],
    createRuntime: createSoccerRuntime,
  },
  {
    id: 3,
    theme: 'Basketball',
    perspective: 'Third-person (Side 2.5D)',
    objective: 'Reach a 10-point threshold',
    mechanics: ['move', 'jump', 'shoot'],
    createRuntime: createBasketballRuntime,
  },
  {
    id: 4,
    theme: 'Retro Platformer',
    perspective: 'Third-person (Side-scroll)',
    objective: 'Navigate hazards to reach the flag',
    mechanics: ['move', 'jump', 'crouch'],
    createRuntime: createPlatformerRuntime,
  },
]

export function getLevel(index = 0) {
  return LEVELS[index]
}

export function describeMechanics(mechanics) {
  return mechanics.map((m) => MECHANIC_LABELS[m]).join(' / ')
}
