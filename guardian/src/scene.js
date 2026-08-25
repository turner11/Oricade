import Phaser from 'phaser'
import { WALK_SPEED } from './game-config.js'
import { TILE, ZONE, isSolid, zoneSize, spawnPoint, facingFrom, SPRITE_FRAMES } from './zone.js'

const DIRECTIONS = ['up', 'down', 'left', 'right']
const TILE_COLOR = { '#': 0x4a4a4a, T: 0x2d5a27, '~': 0x1f4e79 }
const SPRITE_W = 16
const SPRITE_H = 20

// ponytail: untested — same Phaser/canvas ceiling as main.js, see that file.
export class MainScene extends Phaser.Scene {
  create() {
    const { width, height } = zoneSize()

    this.add.rectangle(0, 0, width, height, 0x14141f).setOrigin(0, 0)

    const walls = this.physics.add.staticGroup()
    ZONE.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c]
        if (!isSolid(ch)) continue
        const rect = this.add.rectangle(
          c * TILE + TILE / 2,
          r * TILE + TILE / 2,
          TILE,
          TILE,
          TILE_COLOR[ch]
        )
        walls.add(rect)
      }
    })

    this.createWalkAnims()

    const spawn = spawnPoint()
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'walk-down-0')
    this.player.body.setSize(TILE * 0.6, TILE * 0.6)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, walls)

    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)
    this.cameras.main.startFollow(this.player)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys('W,A,S,D')
  }

  // Placeholder walk-cycle art: bake two Graphics frames per direction (legs swap sides) into
  // textures via Graphics#generateTexture — see the ponytail note on SPRITE_FRAMES in zone.js.
  createWalkAnims() {
    const g = this.add.graphics()

    DIRECTIONS.forEach((dir) => {
      const { color, legOffsets } = SPRITE_FRAMES[dir]
      legOffsets.forEach((legOffset, i) => {
        g.clear()
        g.fillStyle(color, 1)
        g.fillRect(2, 0, 12, 14)
        g.fillRect(8 + legOffset - 2, 14, 4, 6)
        g.fillRect(8 - legOffset - 2, 14, 4, 6)
        g.generateTexture(`walk-${dir}-${i}`, SPRITE_W, SPRITE_H)
      })

      this.anims.create({
        key: `walk-${dir}`,
        frames: [{ key: `walk-${dir}-0` }, { key: `walk-${dir}-1` }],
        frameRate: 6,
        repeat: -1,
      })
    })

    g.destroy()
  }

  update() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown
    const up = this.cursors.up.isDown || this.wasd.W.isDown
    const down = this.cursors.down.isDown || this.wasd.S.isDown

    const vx = (right ? 1 : 0) - (left ? 1 : 0)
    const vy = (down ? 1 : 0) - (up ? 1 : 0)

    this.player.setVelocity(vx, vy)
    this.player.body.velocity.normalize().scale(WALK_SPEED)

    const dir = facingFrom(vx, vy)
    if (dir) {
      this.player.anims.play(`walk-${dir}`, true)
    } else {
      this.player.anims.stop()
    }
  }
}
