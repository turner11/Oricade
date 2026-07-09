import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { createCharacterMesh, animateCharacter, faceMovement } from './character.js'
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

  it('swings arms and legs in opposite phase while moving', () => {
    const char = createCharacterMesh()
    animateCharacter(char, 4, 0.1)
    const armL = char.getObjectByName('armL').rotation.x
    const armR = char.getObjectByName('armR').rotation.x
    expect(armL).not.toBe(0)
    expect(armR).toBeCloseTo(-armL)
    expect(char.getObjectByName('legL').rotation.x).toBeCloseTo(-armL)
  })

  it('rests all limbs when standing still', () => {
    const char = createCharacterMesh()
    animateCharacter(char, 4, 0.1) // walk first so limbs are mid-swing
    animateCharacter(char, 0, 0.2)
    for (const part of ['armL', 'armR', 'legL', 'legR']) {
      expect(char.getObjectByName(part).rotation.x).toBe(0)
    }
  })

  it('turns to face the movement direction', () => {
    const char = createCharacterMesh()
    faceMovement(char, 0, -1) // forward (-z) is the default facing
    expect(char.rotation.y).toBeCloseTo(0)
    faceMovement(char, 1, 0) // moving right
    expect(char.rotation.y).toBeCloseTo(-Math.PI / 2)
  })

  it('keeps its current facing when there is no movement', () => {
    const char = createCharacterMesh()
    faceMovement(char, 1, 0)
    const facing = char.rotation.y
    faceMovement(char, 0, 0)
    expect(char.rotation.y).toBe(facing)
  })

  it('tints the body with the given color, defaulting to the player palette color', () => {
    const defaultChar = createCharacterMesh()
    expect(defaultChar.getObjectByName('body').material.color.getHex()).toBe(PALETTE.player)

    const pink = createCharacterMesh(PALETTE.accentPink)
    expect(pink.getObjectByName('body').material.color.getHex()).toBe(PALETTE.accentPink)
  })
})
