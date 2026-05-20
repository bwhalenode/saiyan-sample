import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join, basename, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const INPUT_DIR  = join(__dirname, '..', 'public', 'images')
const MAX_WIDTH  = 1600
const JPG_Q      = 82
const WEBP_Q     = 80

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB'
}

async function optimise(filePath) {
  const ext     = extname(filePath).toLowerCase()
  const name    = basename(filePath, extname(filePath))
  const isPng   = ext === '.png'
  const outJpg  = join(INPUT_DIR, name + '.jpg')   // always write to .jpg
  const outWebp = join(INPUT_DIR, name + '.webp')

  const { size: before } = await stat(filePath)

  const pipeline = sharp(filePath).resize({ width: MAX_WIDTH, withoutEnlargement: true })

  // Compressed JPG (mozjpeg encoder) — atomic write so we never clobber a PNG source
  await pipeline
    .clone()
    .jpeg({ quality: JPG_Q, mozjpeg: true })
    .toFile(outJpg + '.tmp')

  // WebP
  await pipeline
    .clone()
    .webp({ quality: WEBP_Q })
    .toFile(outWebp)

  const { rename } = await import('fs/promises')
  await rename(outJpg + '.tmp', outJpg)

  const { size: afterJpg  } = await stat(outJpg)
  const { size: afterWebp } = await stat(outWebp)

  console.log(`\n  ${name}  (source: ${ext})`)
  console.log(`    JPG  ${fmtKB(before).padStart(9)} → ${fmtKB(afterJpg).padStart(9)}  (${Math.round((1 - afterJpg / before) * 100)}% saved)`)
  console.log(`    WebP ${' '.repeat(9)}   ${fmtKB(afterWebp).padStart(9)}  (${Math.round((1 - afterWebp / before) * 100)}% vs original)`)
}

async function run() {
  const files = (await readdir(INPUT_DIR))
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .map(f => join(INPUT_DIR, f))

  if (!files.length) {
    console.log('No image files found in public/images/')
    process.exit(0)
  }

  console.log(`Optimising ${files.length} image(s) in public/images/ …`)

  for (const f of files) {
    await optimise(f)
  }

  console.log('\nDone.\n')
}

run().catch(err => { console.error(err); process.exit(1) })
