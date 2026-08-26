import Phaser from 'phaser'
import { WIDTH, HEIGHT, TARGET_FPS } from './game-config.js'
import { MainScene } from './scene.js'

// ponytail: untested — Phaser needs a real <canvas> 2D context even under jsdom
// (confirmed by spike: importing phaser at module scope crashes headless). Verify
// via manual smoke test (npx vite --config guardian/vite.config.js) instead.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#0a0a12',
  fps: { target: TARGET_FPS },
  physics: { default: 'arcade' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [MainScene],
})
