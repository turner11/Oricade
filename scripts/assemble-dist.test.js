import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { assembleDist } from './assemble-dist.js'

describe('assembleDist', () => {
  let tmp

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oricade-dist-'))
    fs.mkdirSync(path.join(tmp, 'dist', 'oricade'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'dist', 'oricade', 'index.html'), '<p>oricade</p>')
    fs.mkdirSync(path.join(tmp, 'landing'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'landing', 'index.html'), '<p>landing</p>')
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it('copies the landing page to the dist root without touching the game builds', () => {
    assembleDist({
      distDir: path.join(tmp, 'dist'),
      landingDir: path.join(tmp, 'landing'),
    })

    expect(fs.readFileSync(path.join(tmp, 'dist', 'index.html'), 'utf8')).toBe('<p>landing</p>')
    expect(fs.readFileSync(path.join(tmp, 'dist', 'oricade', 'index.html'), 'utf8')).toBe('<p>oricade</p>')
  })
})
