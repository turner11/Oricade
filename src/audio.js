const BASE_FREQUENCY = 220
const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14]

export function noteFrequency(levelIndex) {
  const step = SCALE_STEPS[levelIndex % SCALE_STEPS.length]
  return BASE_FREQUENCY * 2 ** (step / 12)
}

export class AudioManager {
  constructor() {
    this.ctx = null
    this.musicOsc = null
    this.musicGain = null
  }

  ensureContext() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      this.ctx = new Ctx()
    }
    return this.ctx
  }

  playSfx(freq, duration = 0.15, type = 'square') {
    const ctx = this.ensureContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  }

  playMusicForLevel(levelIndex) {
    const ctx = this.ensureContext()
    this.stopMusic()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = noteFrequency(levelIndex) / 2
    gain.gain.value = 0.04
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    this.musicOsc = osc
    this.musicGain = gain
  }

  stopMusic() {
    if (this.musicOsc) {
      this.musicOsc.stop()
      this.musicOsc.disconnect()
      this.musicOsc = null
      this.musicGain = null
    }
  }
}

export const audio = new AudioManager()
