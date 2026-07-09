import * as THREE from 'three'

const BURST_COUNT = 8
const BURST_SPEED = 3
const BURST_LIFE = 0.4

export function stepParticle(particle, dt) {
  return {
    ...particle,
    position: {
      x: particle.position.x + particle.velocity.x * dt,
      y: particle.position.y + particle.velocity.y * dt,
      z: particle.position.z + particle.velocity.z * dt,
    },
    life: particle.life - dt,
  }
}

export function isExpired(particle) {
  return particle.life <= 0
}

const active = []

export function spawnBurst(scene, position, color) {
  for (let i = 0; i < BURST_COUNT; i++) {
    const angle = (i / BURST_COUNT) * Math.PI * 2
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08), new THREE.MeshBasicMaterial({ color }))
    mesh.position.set(position.x, position.y, position.z)
    scene.add(mesh)
    active.push({
      mesh,
      position: { ...position },
      velocity: { x: Math.cos(angle) * BURST_SPEED, y: BURST_SPEED * 0.6, z: Math.sin(angle) * BURST_SPEED },
      life: BURST_LIFE,
    })
  }
}

export function updateBursts(scene, dt) {
  for (let i = active.length - 1; i >= 0; i--) {
    const next = stepParticle(active[i], dt)
    if (isExpired(next)) {
      scene.remove(active[i].mesh)
      active.splice(i, 1)
    } else {
      active[i] = { ...next, mesh: active[i].mesh }
      active[i].mesh.position.set(next.position.x, next.position.y, next.position.z)
    }
  }
}
