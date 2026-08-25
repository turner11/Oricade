import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function assembleDist({ distDir, landingDir, guardianDir }) {
  fs.copyFileSync(path.join(landingDir, 'index.html'), path.join(distDir, 'index.html'))
  fs.cpSync(guardianDir, path.join(distDir, 'guardian'), { recursive: true })
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)))
  assembleDist({
    distDir: path.join(root, 'dist'),
    landingDir: path.join(root, 'landing'),
    guardianDir: path.join(root, 'guardian'),
  })
}
