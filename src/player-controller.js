import { CHARACTER, computeVelocity, jumpVelocity } from './physics.js'

const GROUNDED_EPSILON = 0.05

export class PlayerController {
  constructor(body) {
    this.body = body
  }

  update(inputState, speedMultiplier = 1) {
    const grounded = this.body.position.y <= CHARACTER.height / 2 + GROUNDED_EPSILON
    const velocity = computeVelocity(inputState.move, inputState.crouch, this.body.velocity.y, speedMultiplier)
    const jump = jumpVelocity(grounded, inputState.jump)

    this.body.velocity.x = velocity.x
    this.body.velocity.z = velocity.z
    this.body.velocity.y = jump ?? velocity.y
  }
}
