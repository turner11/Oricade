export const P1_KEYS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  shoot: 'KeyF',
  crouch: 'ShiftLeft',
  magic: 'KeyE',
}

export const P2_KEYS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  jump: 'Numpad0',
  shoot: 'Numpad1',
  crouch: 'ControlRight',
  magic: 'Numpad2',
}

const GAMEPAD_BUTTONS = { jump: 0, shoot: 2, magic: 3, crouch: 6 }
const STICK_DEADZONE = 0.2

function axisToAxisValue(v) {
  if (v > STICK_DEADZONE) return 1
  if (v < -STICK_DEADZONE) return -1
  return 0
}

export function keysToState(pressed, keyMap) {
  return {
    move: {
      x: (pressed.has(keyMap.right) ? 1 : 0) - (pressed.has(keyMap.left) ? 1 : 0),
      y: (pressed.has(keyMap.up) ? 1 : 0) - (pressed.has(keyMap.down) ? 1 : 0),
    },
    jump: pressed.has(keyMap.jump),
    shoot: pressed.has(keyMap.shoot),
    crouch: pressed.has(keyMap.crouch),
    magic: pressed.has(keyMap.magic),
  }
}

export function gamepadToState(gamepad) {
  if (!gamepad) {
    return { move: { x: 0, y: 0 }, jump: false, shoot: false, crouch: false, magic: false }
  }
  return {
    move: {
      x: axisToAxisValue(gamepad.axes[0] ?? 0),
      y: axisToAxisValue(-(gamepad.axes[1] ?? 0)),
    },
    jump: !!gamepad.buttons[GAMEPAD_BUTTONS.jump]?.pressed,
    shoot: !!gamepad.buttons[GAMEPAD_BUTTONS.shoot]?.pressed,
    crouch: !!gamepad.buttons[GAMEPAD_BUTTONS.crouch]?.pressed,
    magic: !!gamepad.buttons[GAMEPAD_BUTTONS.magic]?.pressed,
  }
}

function clamp(v) {
  return Math.max(-1, Math.min(1, v))
}

export function mergeStates(a, b) {
  return {
    move: { x: clamp(a.move.x + b.move.x), y: clamp(a.move.y + b.move.y) },
    jump: a.jump || b.jump,
    shoot: a.shoot || b.shoot,
    crouch: a.crouch || b.crouch,
    magic: a.magic || b.magic,
  }
}

export function computeInputState(pressed, gamepads) {
  return {
    p1: mergeStates(keysToState(pressed, P1_KEYS), gamepadToState(gamepads[0])),
    p2: mergeStates(keysToState(pressed, P2_KEYS), gamepadToState(gamepads[1])),
  }
}

export class InputController {
  constructor(target = window) {
    this.pressed = new Set()
    target.addEventListener('keydown', (e) => this.pressed.add(e.code))
    target.addEventListener('keyup', (e) => this.pressed.delete(e.code))
  }

  getState() {
    return computeInputState(this.pressed, navigator.getGamepads())
  }
}
