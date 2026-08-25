import Phaser from 'phaser'
import { WIDTH, HEIGHT, TARGET_FPS } from './game-config.js'
import { MainScene } from './scene.js'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0a0a12',
  fps: { target: TARGET_FPS },
  scene: [MainScene],
})
