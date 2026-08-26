// Phaser-free cue table: pure, no Web Audio calls, colocated-tested — same convention as
// daynight.js/settings.js/save.js. scene.js is the only consumer; it turns a cue descriptor
// into an oscillator routed through Phaser's this.sound.destination (see scene.js's playCue()).
//
// These are synthesized placeholder tones, NOT the GDD's Shamisen/Koto direction — this issue
// (#50) builds the audio *pipeline* only; the real BGM/SFX asset pass is deferred to a human/
// design follow-up (see the plan's Verdict). When real files land, they belong in
// guardian/public/audio/, loaded via this.load.audio() in a preload() — Vite's default
// publicDir for guardian/vite.config.js's root is guardian/public/, which does not exist yet.
//
// ponytail: duplicates the osc+gain shape of ../../src/audio.js rather than importing it —
// that file builds its own AudioContext and connects to ctx.destination, bypassing Phaser's
// volume/mute chain, and guardian's vite.config.js sets root: guardianDir so a ../../src import
// would cross the two separately-built games' bundle boundary. ~20 duplicated lines is cheaper.

export const CUES = Object.freeze({
  footstep: { freq: 150, duration: 0.05, type: 'triangle' },
  door: { freq: 90, duration: 0.3, type: 'sawtooth' },
  pickup: { freq: 880, duration: 0.15, type: 'square' },
  ui: { freq: 660, duration: 0.05, type: 'square' },
  // BGM drones: sustained, so duration is irrelevant — 0 documents "not a one-shot".
  'bgm-day': { freq: 220, duration: 0, type: 'sine' },
  'bgm-night': { freq: 110, duration: 0, type: 'sine' },
})

export function cueFor(name) {
  return CUES[name]
}
