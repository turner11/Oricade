import Phaser from 'phaser'
import {
  WALK_SPEED,
  PLAYER_MAX_HP,
  ATTACK_MS,
  IFRAME_MS,
  KNOCKBACK_SPEED,
  KNOCKBACK_MS,
  SIGHT_RANGE,
  WIDTH,
  HEIGHT,
  NIGHT_TINT,
  NIGHT_TINT_ALPHA,
  PROJECTILE_SPEED,
  PROJECTILE_MS,
  WHISPER_SPREAD_RAD,
  GALE_TURN_MS,
  DASH_SPEED,
  DASH_MS,
  DASH_COOLDOWN_MS,
  CHARGE_MS,
  CHARGED_DAMAGE,
  CHARGED_SCALE,
  TEXT_SPEED_MIN,
  TEXT_SPEED_MAX,
} from './game-config.js'
import {
  TILE,
  ZONES,
  TILE_COLOR,
  isSolid,
  isWarp,
  zoneSize,
  spawnPoint,
  doorPosition,
  keyPosition,
  npcPosition,
  warpPosition,
  tileAt,
  facingFrom,
  SHRINE_KEY,
} from './zone.js'
import {
  ENEMY,
  ZONE_ENEMIES,
  attackRect,
  takeHit,
  hasLineOfSight,
  heartString,
  spreadAngles,
  dashVelocity,
  DASH,
  CHARGED_ATTACK,
} from './combat.js'
import { SAVE_KEY, defaultState, serialize, deserialize } from './save.js'
import { NPC_LINE, typewriterChars, questLogEntries } from './dialogue.js'
import { phaseAt } from './daynight.js'
import { KEY_ACTIONS, stickVector, keyNameFromEvent } from './settings.js'

const KEY_COLOR = 0xffd60a
const DOOR_COLOR = 0x6b4226
const NPC_COLOR = 0x6a4c93
const PROJECTILE_COLOR = 0xffe066

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
  // `data` is passed by scene.restart({ zone, x, y, hp }) on a zone warp — it's preferred over
  // the loaded save so a swallowed localStorage write (save() deliberately ignores failures)
  // can't strand the player in the wrong zone.
  create(data) {
    // Phaser reuses the same Scene instance across scene.restart() (zone warps) — these must be
    // nulled here, not just at the point they're first assigned, or a truthy-but-destroyed
    // reference from the previous zone survives into this one (e.g. updateDoor()'s
    // `if (locked && !this.doorBody)` guard never fires, so a new zone's door never spawns).
    this.doorBody = null
    this.npc = null
    this.keySprite = null

    const save = deserialize(localStorage.getItem(SAVE_KEY)) ?? defaultState()
    this.zoneIndex = data?.zone ?? save.zone
    const px = data?.x ?? save.player.x
    const py = data?.y ?? save.player.y
    const hp = data?.hp ?? save.player.hp

    const { width, height } = zoneSize(this.zoneIndex)

    this.add.rectangle(0, 0, width, height, 0x14141f).setOrigin(0, 0)

    this.inventory = save.inventory
    this.talkedToNpc = save.talkedToNpc
    this.skills = save.skills
    this.settings = save.settings

    const walls = this.physics.add.staticGroup()
    ZONES[this.zoneIndex].forEach((row, r) => {
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

    this.player = this.physics.add.sprite(px, py, 'walk-down-0')
    this.player.body.setSize(TILE * 0.6, TILE * 0.6)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, walls)

    this.physics.world.setBounds(0, 0, width, height)
    this.cameras.main.setBounds(0, 0, width, height)
    this.cameras.main.startFollow(this.player)

    this.stick = { x: 0, y: 0 }
    this.touchAttackRelease = false
    this.touchAttackAt = 0
    this.touchAttackCharged = false
    this.touchDash = false
    this.applySettings()

    this.facing = 'down'
    this.playerState = { hp, invincibleUntil: 0 }
    this.attackUntil = 0
    this.knockbackUntil = 0
    this.nextDashAt = 0
    this.warpLatch = isWarp(tileAt(this.zoneIndex, px, py))

    // ponytail: this.game.loop.time is the global engine clock, not the scene-local this.time.now
    // — it keeps ticking across scene.restart() (zone warps), so the day/night cycle doesn't
    // snap back to dawn every time the player walks through a warp tile.
    this.phase = phaseAt(this.game.loop.time)

    // One group + one collider + one overlap for every enemy in the zone, membership changing
    // as spawnEnemies()/destroyEnemyRecord() add and remove sprites — cheaper than rebinding a
    // collider/overlap per enemy per spawn.
    this.enemyGroup = this.physics.add.group()
    this.physics.add.collider(this.enemyGroup, this.walls)
    this.enemyOverlap = this.physics.add.overlap(this.player, this.enemyGroup, (_player, sprite) =>
      this.onEnemyContact(sprite.getData('rec'))
    )
    this.projectiles = this.physics.add.group()

    this.spawnEnemies()
    this.spawnShrine()
    this.spawnNpc()
    this.updateDoor()

    // Scroll-factor-0 rect covers the whole camera view; alpha reflects the phase this scene
    // woke up in (a restart can land mid-night). Depth 0.5 (not the default 0): Phaser
    // stable-sorts by depth, so a same-depth sprite added *after* this rect (a night-only enemy,
    // the attack VFX rect) would otherwise draw on top of it un-tinted even though it's
    // logically "in the world". Sitting between sprites (0) and hpText (1) makes the sort order
    // right regardless of add order.
    this.nightTint = this.add
      .rectangle(0, 0, WIDTH, HEIGHT, NIGHT_TINT, this.phase === 'night' ? NIGHT_TINT_ALPHA : 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0.5)

    this.dialogueOpen = false
    this.updateQuestLogUI()

    // ponytail: HP is a Phaser text object with setScrollFactor(0), not the HTML/CSS overlay
    // the GDD §4 describes — fold it into the real overlay in GoJ 06, when dialogue and the
    // quest log need one anyway. The inventory readout below uses the real overlay already,
    // since this issue is the one that introduces it.
    this.hpText = this.add
      .text(8, 8, heartString(this.playerState.hp, PLAYER_MAX_HP), { fontSize: '20px' })
      .setScrollFactor(0)
      .setDepth(1) // above the night tint (depth 0.5)

    this.updateInventoryUI()
    this.wireUI()
  }

  // Rebuilds this.cursors/this.keys from this.settings.keys. Arrow keys stay a fixed,
  // non-rebindable secondary binding alongside the rebindable WASD/space/shift set.
  // Object.fromEntries + addKey (not the addKeys object-form shortcut) — see the plan's open risk
  // on Phaser 4's addKeys object form.
  bindKeys() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = Object.fromEntries(
      Object.entries(this.settings.keys).map(([action, code]) => [
        action,
        this.input.keyboard.addKey(code),
      ])
    )
  }

  // Called from create() and every settings-panel handler so a rebind/volume/mute change takes
  // effect immediately, no reload needed. removeAllKeys(true) also clears the cursor keys, which
  // is why bindKeys() recreates `cursors` too, not just `this.keys`.
  applySettings() {
    this.input.keyboard.removeAllKeys(true)
    this.bindKeys()
    this.sound.volume = this.settings.volume
    this.sound.mute = this.settings.muted
  }

  // Attaches the touch-pad and settings-panel handlers by property assignment (el.onpointerdown =
  // ..., not addEventListener) — Phaser reuses the same Scene instance across scene.restart()
  // (zone warps, see the comment at the top of create()), so addEventListener would stack a
  // duplicate handler per warp. Property assignment is idempotent by construction.
  wireUI() {
    const stickPad = document.getElementById('stick-pad')
    const stickKnob = document.getElementById('stick-knob')
    if (stickPad && stickKnob) {
      let dragging = false
      let cx = 0
      let cy = 0
      let radius = 0
      stickPad.onpointerdown = (e) => {
        dragging = true
        stickPad.setPointerCapture(e.pointerId)
        // Radius comes from the pad's own rect, not a separate constant — one declaration of
        // the pad's size (the CSS), not two that can drift out of sync.
        const rect = stickPad.getBoundingClientRect()
        cx = rect.left + rect.width / 2
        cy = rect.top + rect.height / 2
        radius = rect.width / 2
      }
      stickPad.onpointermove = (e) => {
        if (!dragging) return
        this.stick = stickVector(e.clientX - cx, e.clientY - cy, radius)
        stickKnob.style.transform = `translate(${this.stick.x * radius}px, ${this.stick.y * radius}px)`
      }
      const release = () => {
        dragging = false
        this.stick = { x: 0, y: 0 }
        stickKnob.style.transform = 'translate(0, 0)'
      }
      stickPad.onpointerup = release
      stickPad.onpointercancel = release
    }

    const attackBtn = document.getElementById('attack-btn')
    if (attackBtn) {
      attackBtn.onpointerdown = () => {
        this.touchAttackAt = this.time.now
      }
      attackBtn.onpointerup = () => {
        this.touchAttackCharged = this.time.now - this.touchAttackAt >= CHARGE_MS
        this.touchAttackRelease = true
      }
    }

    const dashBtn = document.getElementById('dash-btn')
    if (dashBtn) {
      dashBtn.onpointerdown = () => {
        this.touchDash = true
      }
    }

    const gearBtn = document.getElementById('settings-gear')
    const panel = document.getElementById('settings-panel')
    if (gearBtn && panel) {
      gearBtn.onclick = () => {
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block'
      }
    }

    // Text speed and volume are live-read/set properties (update() reads this.settings.textSpeed
    // every frame; this.sound.volume is a direct Phaser property) — neither needs a key rebuild,
    // so their oninput handlers skip applySettings()/removeAllKeys() entirely and only save() on
    // 'change' (pointer release), not on every tick of the drag. Only a key rebind touches
    // applySettings().
    const textSpeedInput = document.getElementById('text-speed-input')
    if (textSpeedInput) {
      textSpeedInput.min = TEXT_SPEED_MIN
      textSpeedInput.max = TEXT_SPEED_MAX
      // Slider position is displayed "speed", not raw ms-per-char, so dragging right (higher
      // position) means faster typing (lower textSpeed) — the intuitive direction. Invert by
      // reflecting around min+max.
      textSpeedInput.value = TEXT_SPEED_MIN + TEXT_SPEED_MAX - this.settings.textSpeed
      textSpeedInput.oninput = () => {
        this.settings.textSpeed = TEXT_SPEED_MIN + TEXT_SPEED_MAX - Number(textSpeedInput.value)
      }
      textSpeedInput.onchange = () => this.save()
    }

    const volumeInput = document.getElementById('volume-input')
    if (volumeInput) {
      volumeInput.value = this.settings.volume
      volumeInput.oninput = () => {
        this.settings.volume = Number(volumeInput.value)
        this.sound.volume = this.settings.volume
      }
      volumeInput.onchange = () => this.save()
    }

    const muteInput = document.getElementById('mute-input')
    if (muteInput) {
      muteInput.checked = this.settings.muted
      muteInput.onchange = () => {
        this.settings.muted = muteInput.checked
        this.sound.mute = this.settings.muted
        this.save()
      }
    }

    for (const action of KEY_ACTIONS) {
      const btn = document.getElementById(`rebind-${action}`)
      if (!btn) continue
      btn.textContent = `${action}: ${this.settings.keys[action]}`
      btn.onclick = () => {
        btn.textContent = `${action}: press a key…`
        document.onkeydown = (e) => {
          document.onkeydown = null
          const name = keyNameFromEvent(e)
          if (!name) {
            btn.textContent = `${action}: ${this.settings.keys[action]}`
            return
          }
          this.settings.keys[action] = name
          btn.textContent = `${action}: ${name}`
          this.applySettings()
          this.save()
        }
      }
    }
  }

  // Spawns the shrine key pickup only if the key isn't already in the loaded save's inventory,
  // and only in a zone that has a 'K' tile (zone 0 — see zone.js's null-when-absent contract).
  // The door itself is owned by updateDoor(), not this method.
  spawnShrine() {
    if (this.inventory.includes(SHRINE_KEY)) return
    const key = keyPosition(this.zoneIndex)
    if (!key) return

    if (!this.textures.exists('shrine-key')) {
      const g = this.add.graphics()
      g.fillStyle(KEY_COLOR, 1)
      g.fillRect(0, 0, TILE * 0.5, TILE * 0.5)
      g.generateTexture('shrine-key', TILE * 0.5, TILE * 0.5)
      g.destroy()
    }

    this.keySprite = this.physics.add.sprite(key.x, key.y, 'shrine-key')
    this.keyOverlap = this.physics.add.overlap(this.player, this.keySprite, () =>
      this.pickupKey()
    )
  }

  // Static overlap target (dialogue trigger), not an obstacle — no wall collider needed. Only
  // in a zone that has an 'N' tile (zone 0 — dialogue/NPCs stay zone-0-only per this issue's
  // scope). Same "bake a flat-color texture once, cache on the scene" pattern as spawnEnemies().
  // ponytail: flat color block, no walk cycle — same art-pass deferral as the enemies, see SPRITE_FRAMES.
  spawnNpc() {
    const npc = npcPosition(this.zoneIndex)
    if (!npc) return

    if (!this.textures.exists('npc')) {
      const g = this.add.graphics()
      g.fillStyle(NPC_COLOR, 1)
      g.fillRect(0, 0, SPRITE_W, SPRITE_H)
      g.generateTexture('npc', SPRITE_W, SPRITE_H)
      g.destroy()
    }

    this.npc = this.physics.add.sprite(npc.x, npc.y, 'npc')
    this.npc.setVisible(this.phase === 'day')
  }

  // Push the key into inventory, tear down the sprite/overlap, and let updateDoor() re-evaluate
  // the lock — mirrors destroyEnemyRecord()'s "destroy sprite + destroy every collider/overlap
  // bound to it" pattern, since Arcade Physics leaks stale colliders otherwise.
  pickupKey() {
    this.inventory.push(SHRINE_KEY)
    this.keySprite.destroy()
    this.keyOverlap.destroy()
    this.keySprite = null
    this.keyOverlap = null
    this.updateDoor()
    this.updateInventoryUI()
    this.updateQuestLogUI()
    this.save()
  }

  updateInventoryUI() {
    const el = document.getElementById('inventory-ui')
    if (!el) return
    let text = this.inventory.includes(SHRINE_KEY) ? 'Inventory: Shrine Key' : 'Inventory: (empty)'
    const skillNames = { [DASH]: 'Dash', [CHARGED_ATTACK]: 'Charged Attack' }
    if (this.skills.length > 0) {
      text += ` · Skills: ${this.skills.map((s) => skillNames[s] ?? s).join(', ')}`
    }
    el.textContent = text
  }

  updateQuestLogUI() {
    const el = document.getElementById('quest-log-ui')
    if (!el) return
    const entries = questLogEntries(this.talkedToNpc, this.inventory.includes(SHRINE_KEY))
    el.textContent = entries.map((e) => `${e.text}${e.done ? ' (done)' : ''}`).join('\n')
  }

  // localStorage can throw in private-browsing/quota-exceeded edge cases — swallow and
  // continue rather than crash gameplay over a save failure (no retry/backoff: out of scope
  // per the issue's "autosave cadence").
  // ponytail: settings live inside this same save blob (one storage mechanism, not a second
  // localStorage key) — a corrupt-beyond-repair save takes settings with it too. Costs nothing
  // today since there's no "clear save" flow; split settings to its own key if one ever lands.
  save() {
    const state = {
      zone: this.zoneIndex,
      player: { x: this.player.x, y: this.player.y, hp: this.playerState.hp },
      inventory: this.inventory,
      talkedToNpc: this.talkedToNpc,
      skills: this.skills,
      settings: this.settings,
    }
    try {
      localStorage.setItem(SAVE_KEY, serialize(state))
    } catch {
      // ponytail: swallow-and-continue, see comment above.
    }
  }

  // True while this zone's door should be a solid body. Zone 0's door is the shrine-key puzzle;
  // every other zone's door is guarded by an Ember — locked as long as one is alive in the
  // enemy list.
  doorLocked() {
    if (this.zoneIndex === 0) return !this.inventory.includes(SHRINE_KEY)
    return this.enemies.some((rec) => rec.def.kind === 'ember')
  }

  // Adds/destroys the door's solid body to match doorLocked(). No-op in a zone with no 'D' tile
  // at all (zone 2, the night gauntlet). Called from create(), pickupKey(), respawn(), and the
  // enemy-death branch of doAttack() — anywhere the lock condition can change.
  updateDoor() {
    const door = doorPosition(this.zoneIndex)
    if (!door) return

    const locked = this.doorLocked()
    if (locked && !this.doorBody) {
      this.doorBody = this.add.rectangle(door.x, door.y, TILE, TILE, DOOR_COLOR)
      this.walls.add(this.doorBody)
    } else if (!locked && this.doorBody) {
      this.doorBody.destroy()
      this.doorBody = null
    }
  }

  // Rebuilds this.enemies from ZONE_ENEMIES[this.zoneIndex], filtered to kinds whose phase (if
  // any) matches the current one — a day-only kind (Zane, Stormy) or night-only kind (Ash,
  // Whisper) only exists in its phase, mirroring the old single-enemy zane/ash swap. Reused by
  // create(), setPhase(), and respawn(). Each kind's texture is baked once (under its own key)
  // and cached on the scene, same pattern as createWalkAnims().
  // ponytail: flat colour block with no walk cycle or wind-up tell — art pass is GoJ 11.
  // Builds one enemy record + sprite (+ its texture, baked once and cached on the scene) for a
  // single ZONE_ENEMIES placement. Shared by spawnEnemies() (full-zone rebuild) and setPhase()
  // (phase-gated-only rebuild) so the two don't duplicate the sprite/record construction.
  spawnEnemy(placement, def) {
    if (!this.textures.exists(def.kind)) {
      const g = this.add.graphics()
      g.fillStyle(def.color, 1)
      g.fillRect(0, 0, SPRITE_W, SPRITE_H)
      g.generateTexture(def.kind, SPRITE_W, SPRITE_H)
      g.destroy()
    }

    const at = { x: placement.at.col * TILE + TILE / 2, y: placement.at.row * TILE + TILE / 2 }
    const sprite = this.enemyGroup.create(at.x, at.y, def.kind)
    const patrol = placement.patrol?.map((p) => ({
      x: p.col * TILE + TILE / 2,
      y: p.row * TILE + TILE / 2,
    }))

    const rec = {
      sprite,
      def,
      state: { hp: def.hp, invincibleUntil: 0 },
      waypoint: 0,
      patrol,
      nextFireAt: 0,
      nextTurnAt: 0,
    }
    sprite.setData('rec', rec)
    this.enemies.push(rec)
  }

  spawnEnemies() {
    this.enemies = []

    for (const placement of ZONE_ENEMIES[this.zoneIndex] ?? []) {
      const def = { kind: placement.kind, ...ENEMY[placement.kind] }
      if (def.phase && def.phase !== this.phase) continue
      // A defeated boss never respawns (including after respawn() on player death) — its
      // `unlocks` id, once earned, stays in this.skills for the rest of the save.
      if (def.unlocks && this.skills.includes(def.unlocks)) continue
      this.spawnEnemy(placement, def)
    }
  }

  // Kills one enemy (a sword hit dropping it to 0 HP) without touching the rest of the roster.
  destroyEnemyRecord(rec) {
    rec.sprite.destroy()
    this.enemies = this.enemies.filter((r) => r !== rec)
  }

  // Full teardown, used before spawnEnemies() rebuilds the roster on a phase flip or respawn.
  destroyEnemies() {
    for (const rec of [...this.enemies]) this.destroyEnemyRecord(rec)
  }

  // Stores the new phase, tints the zone, gates the day-only NPC, and rebuilds the enemy roster
  // for this zone under the new phase. bgm-cue is the whole audio deliverable for this issue:
  // Phaser's own scene EventEmitter, no audio manager, no <audio>, no asset loading.
  // ponytail: no listener consumes 'bgm-cue' yet — wire one up when real audio lands.
  setPhase(phase) {
    this.phase = phase
    this.nightTint.setAlpha(phase === 'night' ? NIGHT_TINT_ALPHA : 0)
    this.npc?.setVisible(phase === 'day')

    // Only kinds whose ENEMY def carries a `phase` field (Zane/Ash, Stormy/Whisper) swap on a
    // day/night flip. A kind with no `phase` field (Ember, Gale) is always-present and must
    // survive the flip untouched — destroying/respawning it here would reset Ember to full HP
    // and re-lock a door the player may be standing behind (single-exit shrine room), soft-locking
    // them.
    for (const rec of this.enemies.filter((r) => r.def.phase)) this.destroyEnemyRecord(rec)
    for (const placement of ZONE_ENEMIES[this.zoneIndex] ?? []) {
      const def = { kind: placement.kind, ...ENEMY[placement.kind] }
      if (def.phase === phase) this.spawnEnemy(placement, def)
    }

    this.updateDoor()
    this.events.emit('bgm-cue', phase)
  }

  doAttack(damage = 1) {
    if (this.time.now < this.attackUntil) return
    this.attackUntil = this.time.now + ATTACK_MS

    // ponytail: the hitbox is frozen where it spawned for its 150ms window (~18px of drift at
    // WALK_SPEED — invisible). Parent it to the player if drift ever shows.
    const box = attackRect(this.player.x, this.player.y, this.facing, damage > 1 ? CHARGED_SCALE : 1)
    // Left visible (translucent) on purpose — it's both the hitbox and the swing VFX, for zero
    // extra code.
    const rect = this.add.rectangle(box.x, box.y, box.width, box.height, 0xffffff, 0.4)
    this.physics.add.existing(rect)
    const overlap = this.physics.add.overlap(rect, this.enemyGroup, (_rect, sprite) => {
      const rec = sprite.getData('rec')
      rec.state = takeHit(rec.state, this.time.now, ATTACK_MS, damage)
      if (rec.state.hp <= 0) {
        this.destroyEnemyRecord(rec)
        this.updateDoor()
        if (rec.def.unlocks && !this.skills.includes(rec.def.unlocks)) {
          this.skills.push(rec.def.unlocks)
          this.updateInventoryUI()
          this.save()
        }
      }
    })
    this.time.delayedCall(ATTACK_MS, () => {
      rect.destroy()
      // Collider#destroy() only nulls its own object1/object2/callback refs and removes itself
      // from the world — it never dereferences the enemy sprites — so this is still safe if a
      // phase flip or zone warp tore the roster down inside this 150ms window (see plan's "Open
      // risks: phase flip mid-swing").
      overlap?.destroy()
    })
  }

  // Dodge-dash in the facing direction: rides this.knockbackUntil (the existing window that
  // stops update() overwriting player velocity) rather than a second movement-override flag, and
  // raises invincibleUntil so it's a dodge, not just a lunge.
  doDash() {
    const now = this.time.now
    this.nextDashAt = now + DASH_COOLDOWN_MS
    const v = dashVelocity(this.facing, DASH_SPEED)
    this.player.body.velocity.x = v.x
    this.player.body.velocity.y = v.y
    this.knockbackUntil = now + DASH_MS
    this.playerState = {
      ...this.playerState,
      invincibleUntil: Math.max(this.playerState.invincibleUntil, now + DASH_MS),
    }
  }

  // Shared by melee contact and projectile hits. Knockback always lands; the HP loss is skipped
  // only for contactDamage: 0 (Gale) — it disrupts movement without dealing damage, which is the
  // entirety of its "erratic mover" threat. The invincibility window still has to advance either
  // way: skipping takeHit() entirely for Gale left invincibleUntil frozen at 0, so contact
  // reapplied knockback (and re-entered this branch) every single frame of overlap, pinning the
  // player's velocity for as long as Gale stayed touching them. That window is only KNOCKBACK_MS
  // for the harmless case — a full IFRAME_MS would let a player rub against Gale to buy a second
  // of immunity to the Stormy/Whisper sharing zone 3.
  hurtPlayer(fromX, fromY, contactDamage) {
    const now = this.time.now
    if (now < this.playerState.invincibleUntil) return

    if (contactDamage !== 0) {
      this.playerState = takeHit(this.playerState, now, IFRAME_MS)
      this.hpText.setText(heartString(this.playerState.hp, PLAYER_MAX_HP))
      this.save()
    } else {
      this.playerState = { ...this.playerState, invincibleUntil: now + KNOCKBACK_MS }
    }

    const angle = Phaser.Math.Angle.Between(fromX, fromY, this.player.x, this.player.y)
    this.physics.velocityFromRotation(angle, KNOCKBACK_SPEED, this.player.body.velocity)
    this.knockbackUntil = now + KNOCKBACK_MS

    if (this.playerState.hp <= 0) this.respawn()
  }

  onEnemyContact(rec) {
    if (!rec) return
    this.hurtPlayer(rec.sprite.x, rec.sprite.y, rec.def.contactDamage)
  }

  // Checkpoint is derived from inventory, not separate state: once the shrine key's held zone 0's
  // door is already open, so respawning at spawnPoint() would just make the player re-walk the
  // whole zone for nothing — respawn at the door instead. Gated on zoneIndex === 0 because the
  // shrine key only unlocks zone 0's door — doorPosition() still resolves for other zones (e.g.
  // zone 1 has its own 'D' tile guarded by an Ember, unrelated to the key), so without this gate
  // a player carrying the key who dies in a later zone gets teleported onto that zone's door tile
  // instead of its spawn point.
  respawn() {
    const checkpoint =
      (this.zoneIndex === 0 && this.inventory.includes(SHRINE_KEY) && doorPosition(this.zoneIndex)) ||
      spawnPoint(this.zoneIndex)
    this.player.setPosition(checkpoint.x, checkpoint.y)
    this.playerState = { hp: PLAYER_MAX_HP, invincibleUntil: 0 }
    this.hpText.setText(heartString(this.playerState.hp, PLAYER_MAX_HP))
    this.destroyEnemies()
    this.spawnEnemies()
    this.updateDoor()
    this.save()
  }

  // One slow projectile fired straight at `angle`, colliding with walls and overlapping the
  // player through the same hurtPlayer() path as melee contact.
  // ponytail: straight-line, the GDD's "arcing" is cosmetic — revisit in the GoJ 11 art pass.
  fireProjectile(x, y, angle) {
    if (!this.textures.exists('projectile')) {
      const g = this.add.graphics()
      g.fillStyle(PROJECTILE_COLOR, 1)
      g.fillCircle(TILE * 0.15, TILE * 0.15, TILE * 0.15)
      g.generateTexture('projectile', TILE * 0.3, TILE * 0.3)
      g.destroy()
    }

    const sprite = this.projectiles.create(x, y, 'projectile')
    this.physics.velocityFromRotation(angle, PROJECTILE_SPEED, sprite.body.velocity)

    let destroyed = false
    const destroy = () => {
      if (destroyed) return
      destroyed = true
      wallCollider.destroy()
      playerOverlap.destroy()
      sprite.destroy()
    }
    const wallCollider = this.physics.add.collider(sprite, this.walls, destroy)
    const playerOverlap = this.physics.add.overlap(sprite, this.player, () => {
      this.hurtPlayer(sprite.x, sprite.y)
      destroy()
    })
    this.time.delayedCall(PROJECTILE_MS, destroy)
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

  // Warps to the zone on the other side of `tile` ('E' -> next zone's 'B', 'B' -> previous
  // zone's 'E'), saving first so a failed localStorage write can't strand the player (create()
  // prefers scene.restart()'s data over the save anyway). scene.restart() is Phaser's own full
  // teardown/rebuild — no hand-written sprite/collider cleanup needed for the whole zone.
  warpToZone(tile) {
    const nextZone = tile === 'E' ? this.zoneIndex + 1 : this.zoneIndex - 1
    const twin = tile === 'E' ? 'B' : 'E'
    const dest = warpPosition(nextZone, twin)

    this.zoneIndex = nextZone
    this.player.setPosition(dest.x, dest.y)
    this.save()
    this.scene.restart({ zone: nextZone, x: dest.x, y: dest.y, hp: this.playerState.hp })
  }

  update() {
    // Gate the input write on the knockback window — otherwise this overwrites the knockback
    // impulse from hurtPlayer() on the very next frame.
    if (this.time.now >= this.knockbackUntil) {
      const left = this.cursors.left.isDown || this.keys.left.isDown
      const right = this.cursors.right.isDown || this.keys.right.isDown
      const up = this.cursors.up.isDown || this.keys.up.isDown
      const down = this.cursors.down.isDown || this.keys.down.isDown

      const kx = (right ? 1 : 0) - (left ? 1 : 0)
      const ky = (down ? 1 : 0) - (up ? 1 : 0)
      // Keyboard wins over the touch stick; `||` is correct here since the fallback triggers
      // exactly on 0 (no keyboard input this frame).
      const vx = kx || this.stick.x
      const vy = ky || this.stick.y

      this.player.setVelocity(vx, vy)
      // normalize().scale() discards the stick's analog magnitude — fine, it's effectively an
      // 8-way stick, same speed the keyboard gives.
      this.player.body.velocity.normalize().scale(WALK_SPEED)

      const dir = facingFrom(vx, vy)
      if (dir) {
        this.facing = dir
        this.player.anims.play(`walk-${dir}`, true)
      } else {
        this.player.anims.stop()
      }
    }

    // Charged attack replaces the tap-swing when held past CHARGE_MS, rather than stacking on
    // top of it — the swing itself fires on release, not press, so a quick tap and a held-then-
    // released charge each produce exactly one swing. Charge duration comes from Phaser's own
    // key timing (timeDown/duration) rather than a scene-tracked start time: those are reset by
    // Phaser's resetKeys() on focus loss, so a stale press can't leak into a later tap. The touch
    // attack button mirrors this with this.touchAttackAt/touchAttackCharged (set in wireUI()'s
    // pointerup handler) so both paths converge on one doAttack() call, not two.
    if (Phaser.Input.Keyboard.JustUp(this.keys.attack) || this.touchAttackRelease) {
      const chargedByKey =
        Phaser.Input.Keyboard.JustUp(this.keys.attack) &&
        this.keys.attack.timeDown > 0 &&
        this.keys.attack.duration >= CHARGE_MS
      const chargedByTouch = this.touchAttackRelease && this.touchAttackCharged
      const charged = this.skills.includes(CHARGED_ATTACK) && (chargedByKey || chargedByTouch)
      this.touchAttackRelease = false
      this.doAttack(charged ? CHARGED_DAMAGE : 1)
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.dash) || this.touchDash) {
      this.touchDash = false
      if (this.skills.includes(DASH) && this.time.now >= this.nextDashAt) this.doDash()
    }

    // Latch so arriving on the destination's twin warp tile doesn't bounce the player straight
    // back — it clears once they step off the tile. scene.restart() tears the whole scene down,
    // so nothing below this matters once a warp fires. The forward warp ('E') additionally stays
    // gated while this zone's boss (an enemy record whose def carries `unlocks`) is still alive —
    // same "is a blocking enemy still in this.enemies?" test doorLocked() uses for Ember. 'B'
    // (backward) is never gated.
    const tile = tileAt(this.zoneIndex, this.player.x, this.player.y)
    const bossBlocking = tile === 'E' && this.enemies.some((r) => r.def.unlocks)
    if (isWarp(tile) && !this.warpLatch && !bossBlocking) {
      this.warpToZone(tile)
      return
    }
    this.warpLatch = isWarp(tile)

    // ponytail: this.game.loop.time is the global engine clock — see the note in create().
    const phase = phaseAt(this.game.loop.time)
    if (phase !== this.phase) this.setPhase(phase)

    // this.npc.setVisible(false) alone hides the sprite but leaves its body overlapping, so
    // gate the dialogue trigger on the phase too — not just visibility. Guarded on this.npc
    // since zones without an NPC tile never spawn one.
    const nearNpc = this.npc && this.phase === 'day' && this.physics.overlap(this.player, this.npc)
    if (nearNpc && !this.dialogueOpen) {
      this.dialogueOpen = true
      this.dialogueStart = this.time.now
      if (!this.talkedToNpc) {
        this.talkedToNpc = true
        this.updateQuestLogUI()
        this.save()
      }
    } else if (!nearNpc && this.dialogueOpen) {
      this.dialogueOpen = false
    }

    const dialogueEl = document.getElementById('dialogue-ui')
    if (dialogueEl) {
      dialogueEl.style.display = this.dialogueOpen ? 'block' : 'none'
      if (this.dialogueOpen) {
        const chars = typewriterChars(
          this.time.now - this.dialogueStart,
          this.settings.textSpeed,
          NPC_LINE.length
        )
        dialogueEl.textContent = NPC_LINE.slice(0, chars)
      }
    }

    for (const rec of this.enemies) {
      // A boss's `behavior` is an array of two of these same kinds, run in order — the entire
      // "recombine two already-learned patterns" engine. A non-boss's `behavior` is a plain
      // string; `[x].flat()` normalizes both to an array without a separate boss code path.
      for (const behavior of [rec.def.behavior].flat())
        switch (behavior) {
          case 'chaser': {
            const waypoint = rec.patrol[rec.waypoint]
            if (hasLineOfSight(this.zoneIndex, rec.sprite, this.player, SIGHT_RANGE)) {
              this.physics.moveToObject(rec.sprite, this.player, rec.def.dashSpeed)
            } else {
              this.physics.moveToObject(rec.sprite, waypoint, rec.def.speed)
              if (
                Phaser.Math.Distance.Between(rec.sprite.x, rec.sprite.y, waypoint.x, waypoint.y) <
                4
              ) {
                rec.waypoint = (rec.waypoint + 1) % rec.patrol.length
              }
            }
            break
          }
          case 'caster': {
            if (this.time.now < rec.nextFireAt) break
            if (!hasLineOfSight(this.zoneIndex, rec.sprite, this.player, SIGHT_RANGE)) break
            rec.nextFireAt = this.time.now + rec.def.fireMs
            const angle = Phaser.Math.Angle.Between(
              rec.sprite.x,
              rec.sprite.y,
              this.player.x,
              this.player.y
            )
            for (const a of spreadAngles(angle, rec.def.projectiles, WHISPER_SPREAD_RAD)) {
              this.fireProjectile(rec.sprite.x, rec.sprite.y, a)
            }
            break
          }
          case 'guard':
            break // never moves, never fires — contact damage only, via the enemyGroup overlap
          case 'erratic': {
            if (this.time.now >= rec.nextTurnAt) {
              rec.nextTurnAt = this.time.now + GALE_TURN_MS
              const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
              this.physics.velocityFromRotation(angle, rec.def.speed, rec.sprite.body.velocity)
            }
            break
          }
        }
    }
  }
}
