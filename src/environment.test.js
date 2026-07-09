import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { createScene } from './scene.js'
import { createWorld } from './physics.js'
import { LEVELS } from './levels/registry.js'
import { ENVIRONMENTS, applyEnvironment, activateLevel } from './environment.js'

describe('ENVIRONMENTS', () => {
  it('defines one environment per level', () => {
    expect(ENVIRONMENTS).toHaveLength(LEVELS.length)
  })

  it('gives every level a sky color, ground color, and set dressing', () => {
    for (const env of ENVIRONMENTS) {
      expect(typeof env.sky).toBe('number')
      expect(typeof env.ground).toBe('number')
      const dressing = env.build()
      expect(dressing).toBeInstanceOf(THREE.Object3D)
      expect(dressing.children.length).toBeGreaterThan(0)
    }
  })

  it('dresses themed levels with recognizable props', () => {
    const byTheme = (theme) => ENVIRONMENTS[LEVELS.findIndex((l) => l.theme === theme)]
    expect(byTheme('Soccer').build().getObjectByName('pitch-lines')).toBeDefined()
    expect(byTheme('Basketball').build().getObjectByName('court-lines')).toBeDefined()
    expect(byTheme('Unicorn Forest').build().getObjectByName('trees')).toBeDefined()
    expect(byTheme('Space Fleet').build().getObjectByName('stars')).toBeDefined()
  })
})

describe('applyEnvironment', () => {
  it('applies the level sky and ground colors to the scene', () => {
    const { scene } = createScene()
    applyEnvironment(scene, 1)
    expect(scene.background.getHex()).toBe(ENVIRONMENTS[1].sky)
    expect(scene.getObjectByName('ground').material.color.getHex()).toBe(ENVIRONMENTS[1].ground)
  })

  it('shows only the active level dressing when switching levels', () => {
    const { scene } = createScene()
    applyEnvironment(scene, 1)
    applyEnvironment(scene, 2)
    expect(scene.getObjectByName('environment-1').visible).toBe(false)
    expect(scene.getObjectByName('environment-2').visible).toBe(true)
  })
})

describe('activateLevel', () => {
  it('shows only the active level props and parks inactive physics bodies outside the world', () => {
    const world = createWorld()
    const ballA = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3) })
    const ballB = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.3) })
    world.addBody(ballA)
    world.addBody(ballB)
    const slots = new Map([
      [1, { group: new THREE.Group(), bodies: [ballA] }],
      [2, { group: new THREE.Group(), bodies: [ballB] }],
    ])

    activateLevel(slots, 2, world)

    expect(slots.get(1).group.visible).toBe(false)
    expect(slots.get(2).group.visible).toBe(true)
    expect(world.bodies).not.toContain(ballA)
    expect(world.bodies).toContain(ballB)
  })
})
