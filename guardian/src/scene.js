import Phaser from 'phaser'
import { WIDTH, HEIGHT } from './game-config.js'

const TILE = 64

export class MainScene extends Phaser.Scene {
  create() {
    const g = this.add.graphics()
    for (let y = 0; y < HEIGHT; y += TILE) {
      for (let x = 0; x < WIDTH; x += TILE) {
        const shade = (x / TILE + y / TILE) % 2 === 0 ? 0x14141f : 0x1a1a28
        g.fillStyle(shade, 1)
        g.fillRect(x, y, TILE, TILE)
      }
    }
    this.cameras.main.centerOn(WIDTH / 2, HEIGHT / 2)
  }
}
