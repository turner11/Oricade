import Phaser from 'phaser'
import {
  WALK_SPEED,
  PLAYER_MAX_HP,
  ATTACK_MS,
  IFRAME_MS,
  KNOCKBACK_SPEED,
  KNOCKBACK_MS,
  ZANE_HP,
  ZANE_SPEED,
  ZANE_DASH_SPEED,
  SIGHT_RANGE,
} from './game-config.js'
import {
  TILE,
  ZONE,
  TILE_COLOR,
  isSolid,
  zoneSize,
  spawnPoint,
  doorPosition,
  keyPosition,
  facingFrom,
  SHRINE_KEY,
} from './zone.js'
import { ZANE_PATROL, attackRect, takeHit, hasLineOfSight, heartString } from './combat.js'
import { SAVE_KEY, defaultState, serialize, deserialize } from './save.js'

const ZANE_COLOR = 0xb23a48
const KEY_COLOR = 0xffd60a
const DOOR_COLOR = 0x6b4226

const SPRITE_W = 16
const SPRITE_H = 20
const LEG_OFFSETS = [-3, 3]

// Placeholder walk-cycle colors, one per direction. ponytail: flat color blocks, not real
// sprites — swap for a real spritesheet in the GoJ 11 art pass.
const SPRITE_FRAMES = {
  up: 0x3d5a80,
  down: 0xee6c4d,
  left: 0x8ecae6,
  right: 0xffb703,
}

// ponytail: untested — same Phaser/canvas ceiling as main.js, see that file.
export class MainScene extends Phaser.Scene {
  create() {
    const { width, height } = zoneSize()

    this.add.rectangle(0, 0, width, height, 0x14141f).setOrigin(0, 0)

    const save = deserialize(localStorage.getItem(SAVE_KEY)) ?? defaultState()
    this.inventory = save.inventory

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
    this.walls = walls

    this.createWalkAnims()

    this.player = this.physics.add.sprite(save.player.x, save.player.y, 'walk-down-0')
    this.player.body.setSize(TILE * 0.6, TILE * 0.6)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, walls)

    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)
    this.cameras.main.startFollow(this.player)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys('W,A,S,D')
    this.attackKey = this.input.keyboard.addKey('SPACE')
    this.input.on('pointerdown', () => this.doAttack())

    this.facing = 'down'
    this.playerState = { hp: save.player.hp, invincibleUntil: 0 }
    this.attackUntil = 0
    this.knockbackUntil = 0

    this.spawnZane()
    this.spawnShrine()

    // ponytail: HP is a Phaser text object with setScrollFactor(0), not the HTML/CSS overlay
    // the GDD §4 describes — fold it into the real overlay in GoJ 06, when dialogue and the
    // quest log need one anyway. The inventory readout below uses the real overlay already,
    // since this issue is the one that introduces it.
    this.hpText = this.add
      .text(8, 8, heartString(this.playerState.hp, PLAYER_MAX_HP), { fontSize: '20px' })
      .setScrollFactor(0)

    this.updateInventoryUI()
  }

  // Spawns the shrine key pickup and its locked door only if the key isn't already in the
  // loaded save's inventory — mirrors spawnZane()'s "bake texture once" pattern.
  spawnShrine() {
    if (this.inventory.includes(SHRINE_KEY)) return

    if (!this.textures.exists('shrine-key')) {
      const g = this.add.graphics()
      g.fillStyle(KEY_COLOR, 1)
      g.fillRect(0, 0, TILE * 0.5, TILE * 0.5)
      g.generateTexture('shrine-key', TILE * 0.5, TILE * 0.5)
      g.destroy()
    }

    const key = keyPosition()
    this.keySprite = this.physics.add.sprite(key.x, key.y, 'shrine-key')
    this.keyOverlap = this.physics.add.overlap(this.player, this.keySprite, () =>
      this.pickupKey()
    )

    const door = doorPosition()
    this.doorBody = this.add.rectangle(door.x, door.y, TILE, TILE, DOOR_COLOR)
    this.walls.add(this.doorBody)
  }

  // Push the key into inventory, tear down the sprite/overlap/door body — same "destroy
  // sprite + destroy every collider bound to it" pattern as destroyZane(), since Arcade
  // Physics leaks stale colliders otherwise. this.walls auto-drops doorBody on its destroy().
  pickupKey() {
    this.inventory.push(SHRINE_KEY)
    this.keySprite.destroy()
    this.keyOverlap.destroy()
    this.keySprite = null
    this.doorBody.destroy()
    this.doorBody = null
    this.updateInventoryUI()
    this.save()
  }

  updateInventoryUI() {
    const el = document.getElementById('inventory-ui')
    if (!el) return
    el.textContent = this.inventory.includes(SHRINE_KEY)
      ? 'Inventory: Shrine Key'
      : 'Inventory: (empty)'
  }

  // localStorage can throw in private-browsing/quota-exceeded edge cases — swallow and
  // continue rather than crash gameplay over a save failure (no retry/backoff: out of scope
  // per the issue's "autosave cadence").
  save() {
    const state = {
      player: { x: this.player.x, y: this.player.y, hp: this.playerState.hp },
      inventory: this.inventory,
    }
    try {
      localStorage.setItem(SAVE_KEY, serialize(state))
    } catch {
      // ponytail: swallow-and-continue, see comment above.
    }
  }

  // Reused by respawn() as well as the initial create() — Zane's texture is baked once and
  // cached on the scene, same pattern as createWalkAnims(). The player-Zane overlap is
  // (re)bound here too, since respawn() replaces the Zane sprite instance.
  // ponytail: Zane is a flat colour block with no walk cycle or wind-up tell — art pass is GoJ 11.
  spawnZane() {
    if (!this.textures.exists('zane')) {
      const g = this.add.graphics()
      g.fillStyle(ZANE_COLOR, 1)
      g.fillRect(0, 0, SPRITE_W, SPRITE_H)
      g.generateTexture('zane', SPRITE_W, SPRITE_H)
      g.destroy()
    }

    const start = ZANE_PATROL[0]
    this.zane = this.physics.add.sprite(start.x, start.y, 'zane')
    this.zaneWallCollider = this.physics.add.collider(this.zane, this.walls)
    this.zaneOverlap = this.physics.add.overlap(this.player, this.zane, () => this.onZaneContact())
    this.zaneState = { hp: ZANE_HP, invincibleUntil: 0 }
    this.zaneWaypoint = 0
  }

  // Destroys the sprite alongside its colliders — Arcade Physics doesn't drop a Collider just
  // because one side's body is gone, so leaving these out lets stale colliders pile up in the
  // physics world across swings/respawns.
  destroyZane() {
    this.zane.destroy()
    this.zaneWallCollider.destroy()
    this.zaneOverlap.destroy()
    this.zane = null
  }

  doAttack() {
    if (this.time.now < this.attackUntil) return
    this.attackUntil = this.time.now + ATTACK_MS

    // ponytail: the hitbox is frozen where it spawned for its 150ms window (~18px of drift at
    // WALK_SPEED — invisible). Parent it to the player if drift ever shows.
    const box = attackRect(this.player.x, this.player.y, this.facing)
    // Left visible (translucent) on purpose — it's both the hitbox and the swing VFX, for zero
    // extra code.
    const rect = this.add.rectangle(box.x, box.y, box.width, box.height, 0xffffff, 0.4)
    this.physics.add.existing(rect)
    const overlap = this.zane
      ? this.physics.add.overlap(rect, this.zane, () => {
          this.zaneState = takeHit(this.zaneState, this.time.now, ATTACK_MS)
          if (this.zaneState.hp <= 0) this.destroyZane()
        })
      : null
    this.time.delayedCall(ATTACK_MS, () => {
      rect.destroy()
      overlap?.destroy()
    })
  }

  onZaneContact() {
    if (!this.zane) return
    const now = this.time.now
    if (now < this.playerState.invincibleUntil) return

    this.playerState = takeHit(this.playerState, now, IFRAME_MS)
    this.hpText.setText(heartString(this.playerState.hp, PLAYER_MAX_HP))
    this.save()

    const angle = Phaser.Math.Angle.Between(this.zane.x, this.zane.y, this.player.x, this.player.y)
    this.physics.velocityFromRotation(angle, KNOCKBACK_SPEED, this.player.body.velocity)
    this.knockbackUntil = now + KNOCKBACK_MS

    if (this.playerState.hp <= 0) this.respawn()
  }

  // Checkpoint is derived from inventory, not separate state: once the shrine key's held the
  // door is already open, so respawning at spawnPoint() would just make the player re-walk the
  // whole zone for nothing — respawn at the door instead.
  respawn() {
    const checkpoint = this.inventory.includes(SHRINE_KEY) ? doorPosition() : spawnPoint()
    this.player.setPosition(checkpoint.x, checkpoint.y)
    this.playerState = { hp: PLAYER_MAX_HP, invincibleUntil: 0 }
    this.hpText.setText(heartString(this.playerState.hp, PLAYER_MAX_HP))
    if (this.zane) this.destroyZane()
    this.spawnZane()
    this.save()
  }

  // Placeholder walk-cycle art: bake two Graphics frames per direction (legs swap sides) into
  // textures via Graphics#generateTexture — see the ponytail note on SPRITE_FRAMES above.
  createWalkAnims() {
    const g = this.add.graphics()

    Object.entries(SPRITE_FRAMES).forEach(([dir, color]) => {
      LEG_OFFSETS.forEach((legOffset, i) => {
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
    // Gate the input write on the knockback window — otherwise this overwrites the knockback
    // impulse from onZaneContact() on the very next frame.
    if (this.time.now >= this.knockbackUntil) {
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
        this.facing = dir
        this.player.anims.play(`walk-${dir}`, true)
      } else {
        this.player.anims.stop()
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) this.doAttack()

    if (this.zane) {
      const waypoint = ZANE_PATROL[this.zaneWaypoint]
      if (hasLineOfSight(this.zane, this.player, SIGHT_RANGE)) {
        this.physics.moveToObject(this.zane, this.player, ZANE_DASH_SPEED)
      } else {
        this.physics.moveToObject(this.zane, waypoint, ZANE_SPEED)
        if (Phaser.Math.Distance.Between(this.zane.x, this.zane.y, waypoint.x, waypoint.y) < 4) {
          this.zaneWaypoint = (this.zaneWaypoint + 1) % ZANE_PATROL.length
        }
      }
    }
  }
}
