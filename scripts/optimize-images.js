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

// Files whose PNG source has an alpha channel — skip JPG output, preserve alpha in WebP
const ALPHA_NAMES = ['pre-loader', 'logo']

async function optimise(filePath) {
  const ext       = extname(filePath).toLowerCase()
  const name      = basename(filePath, extname(filePath))
  const hasAlpha  = ALPHA_NAMES.some(n => name.includes(n))
  const outJpg    = join(INPUT_DIR, name + '.jpg')
  const outWebp   = join(INPUT_DIR, name + '.webp')

  const { size: before } = await stat(filePath)
  const pipeline = sharp(filePath).resize({ width: MAX_WIDTH, withoutEnlargement: true })

  if (!hasAlpha) {
    // Standard JPG (no alpha needed)
    await pipeline.clone().jpeg({ quality: JPG_Q, mozjpeg: true }).toFile(outJpg + '.tmp')
    const { rename } = await import('fs/promises')
    await rename(outJpg + '.tmp', outJpg)
    const { size: afterJpg } = await stat(outJpg)
    console.log(`\n  ${name}  (source: ${ext})`)
    console.log(`    JPG  ${fmtKB(before).padStart(9)} → ${fmtKB(afterJpg).padStart(9)}  (${Math.round((1 - afterJpg / before) * 100)}% saved)`)
  } else {
    console.log(`\n  ${name}  (source: ${ext}, has alpha — JPG skipped)`)
  }

  // WebP — preserve alpha for alpha sources, lossy otherwise
  const webpOpts = hasAlpha
    ? { quality: WEBP_Q, alphaQuality: 90, lossless: false }
    : { quality: WEBP_Q }

  await pipeline.clone().webp(webpOpts).toFile(outWebp)
  const { size: afterWebp } = await stat(outWebp)
  console.log(`    WebP ${' '.repeat(9)}   ${fmtKB(afterWebp).padStart(9)}  (${Math.round((1 - afterWebp / before) * 100)}% vs original)`)

  // Mobile crop: tight right-side crop around the character + ETH crystal,
  // so portrait phones can frame the silhouette large instead of the wide art.
  if (name === 'hero-1') {
    const meta = await sharp(filePath).metadata()
    const cropLeft  = Math.floor(meta.width * 0.58)
    const cropWidth = meta.width - cropLeft
    const outMobile = join(INPUT_DIR, 'hero-1-mobile.webp')
    await sharp(filePath)
      .extract({ left: cropLeft, top: 0, width: cropWidth, height: meta.height })
      .webp({ quality: WEBP_Q })
      .toFile(outMobile)
    const { size: mobileSize } = await stat(outMobile)
    console.log(`    Mobile WebP ${' '.repeat(2)}   ${fmtKB(mobileSize).padStart(9)}  (right-side character crop)`)
  }
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
