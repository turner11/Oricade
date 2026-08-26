import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.html'),
  'utf8',
)

describe('landing page', () => {
  it('does not advertise either game as coming soon', () => {
    expect(html).not.toMatch(/coming soon/i)
  })

  it('links to both games', () => {
    expect(html).toMatch(/href="\.\/oricade\/"/)
    expect(html).toMatch(/href="\.\/guardian\/"/)
  })

  it('gives each game a real description, not a placeholder', () => {
    const descriptions = [...html.matchAll(/<p class="desc">(.*?)<\/p>/g)].map((m) => m[1])
    expect(descriptions).toHaveLength(2)
    for (const d of descriptions) {
      expect(d.toLowerCase()).not.toMatch(/^(play now|coming soon)$/)
      expect(d.length).toBeGreaterThan(15)
    }
  })

  it('gives each game a thumbnail graphic', () => {
    const thumbCount = (html.match(/class="thumb/g) || []).length
    expect(thumbCount).toBe(2)
  })
})
