export const GAME_TITLE = 'Oricade'
export const GAME_TAGLINE = 'Help Ori relight the Great Arcade!'

export const HERO = {
  name: 'Ori',
  description: 'a brave little spark who dreams of becoming the Arcade Champion',
}

// One plot beat per level, indexed like LEVELS in levels/registry.js.
const STORY_LINES = [
  'Ori powers up in the training room. Time to learn the moves!',
  'The Soccer World lost its star striker. Ori laces up to save the match!',
  'The Basketball Bots challenge Ori to a shootout. Sink 10 to move on!',
  'A glitchy retro world blocks the way. Ori must dodge the traps to reach the flag!',
  'The Brawler Bully guards the next cabinet. Ori has to win the duel!',
  'Deep in the Unicorn Forest, Ori gathers magic gems to recharge the arcade.',
  'Space pirates stole the arcade core! Ori jumps in a starfighter to get it back.',
  'The dungeon hides the final key. Ori sneaks past every trap to grab it.',
  'The Glitch King awaits! Ori uses everything learned to relight the Great Arcade!',
]

export function getStoryLine(levelIndex) {
  return STORY_LINES[levelIndex] ?? ''
}
