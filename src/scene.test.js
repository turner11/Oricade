import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { createScene } from './scene.js'

describe('createScene', () => {
  it('returns a scene containing a ground plane and a light', () => {
    const { scene, camera } = createScene()

    expect(scene).toBeInstanceOf(THREE.Scene)
    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera)

    const ground = scene.children.find((child) => child.name === 'ground')
    expect(ground).toBeInstanceOf(THREE.Mesh)
    expect(ground.geometry).toBeInstanceOf(THREE.PlaneGeometry)

    const light = scene.children.find((child) => child.isLight)
    expect(light).toBeDefined()
  })
})
