// Phaser-free dialogue/quest logic: pure helpers, colocated-tested (no canvas/DOM), consumed by
// scene.js the same way zone.js/combat.js/save.js are.

export const NPC_LINE =
  "The shrine to the north holds an old guardian's blessing — you'll need its key to enter."

export const SHRINE_QUEST_TEXT = 'Find the shrine key and open the shrine door'

// Chars of NPC_LINE visible so far, floor-divided by msPerChar and capped at textLength so the
// typewriter never overflows once elapsedMs runs past the full reveal.
export function typewriterChars(elapsedMs, msPerChar, textLength) {
  return Math.min(textLength, Math.floor(elapsedMs / msPerChar))
}

// Empty until the player has talked to the NPC (no quest to show yet); one entry after that,
// flipping to done once the shrine key is held.
export function questLogEntries(talkedToNpc, hasShrineKey) {
  if (!talkedToNpc) return []
  return [{ text: SHRINE_QUEST_TEXT, done: hasShrineKey }]
}
