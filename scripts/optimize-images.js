import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname } from 'path'

const INPUT_DIR  = new URL('../public/images', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const MAX_WIDTH  = 1600
const JPG_Q      = 82
const WEBP_Q     = 80

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB'
}

async function optimise(filePath) {
  const name    = basename(filePath, extname(filePath))
  const outJpg  = filePath                          // overwrite original
  const outWebp = join(INPUT_DIR, name + '.webp')

  const { size: before } = await stat(filePath)

  const pipeline = sharp(filePath).resize({ width: MAX_WIDTH, withoutEnlargement: true })

  // Compressed JPG (mozjpeg encoder)
  await pipeline
    .clone()
    .jpeg({ quality: JPG_Q, mozjpeg: true })
    .toFile(outJpg + '.tmp')

  // WebP
  await pipeline
    .clone()
    .webp({ quality: WEBP_Q })
    .toFile(outWebp)

  // Atomic swap for the JPG (sharp can't overwrite its own input in-place)
  const { rename } = await import('fs/promises')
  await rename(outJpg + '.tmp', outJpg)

  const { size: afterJpg  } = await stat(outJpg)
  const { size: afterWebp } = await stat(outWebp)

  console.log(`\n  ${name}.jpg`)
  console.log(`    JPG  ${fmtKB(before).padStart(9)} → ${fmtKB(afterJpg).padStart(9)}  (${Math.round((1 - afterJpg / before) * 100)}% saved)`)
  console.log(`    WebP ${' '.repeat(9)}   ${fmtKB(afterWebp).padStart(9)}  (${Math.round((1 - afterWebp / before) * 100)}% vs original)`)
}

async function run() {
  const files = (await readdir(INPUT_DIR))
    .filter(f => /\.jpe?g$/i.test(f))
    .map(f => join(INPUT_DIR, f))

  if (!files.length) {
    console.log('No JPG files found in public/images/')
    process.exit(0)
  }

  console.log(`Optimising ${files.length} image(s) in public/images/ …`)

  for (const f of files) {
    await optimise(f)
  }

  console.log('\nDone.\n')
}

run().catch(err => { console.error(err); process.exit(1) })
