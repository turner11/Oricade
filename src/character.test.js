import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { createCharacterMesh } from './character.js'
import { CHARACTER } from './physics.js'
import { PALETTE } from './theme.js'

describe('createCharacterMesh', () => {
  it('returns a THREE.Group, not a plain box', () => {
    expect(createCharacterMesh()).toBeInstanceOf(THREE.Group)
  })

  it('has a head, body, two eyes, two arms and two legs', () => {
    const char = createCharacterMesh()
    for (const part of ['head', 'body', 'eyeL', 'eyeR', 'armL', 'armR', 'legL', 'legR']) {
      expect(char.getObjectByName(part), `missing part: ${part}`).toBeTruthy()
    }
  })

  it('matches the physics bounding box height, centered on origin', () => {
    const char = createCharacterMesh()
    const box = new THREE.Box3().setFromObject(char)
    expect(box.max.y - box.min.y).toBeCloseTo(CHARACTER.height, 1)
    expect(box.max.y).toBeCloseTo(CHARACTER.height / 2, 1)
    expect(box.min.y).toBeCloseTo(-CHARACTER.height / 2, 1)
  })

  it('tints the body with the given color, defaulting to the player palette color', () => {
    const defaultChar = createCharacterMesh()
    expect(defaultChar.getObjectByName('body').material.color.getHex()).toBe(PALETTE.player)

    const pink = createCharacterMesh(PALETTE.accentPink)
    expect(pink.getObjectByName('body').material.color.getHex()).toBe(PALETTE.accentPink)
  })
})
