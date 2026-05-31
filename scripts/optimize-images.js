import sharp from 'sharp'
import { stat, rename } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const OUT_DIR   = join(ROOT, 'public', 'images')   // published, web-facing images

const MAX_WIDTH = 1600
const JPG_Q     = 82
const WEBP_Q    = 80

/*
 * Explicit build manifest — we only generate the derivatives the site actually
 * loads, so public/images/ stays free of unused files.
 *
 * Source originals that are NOT used directly on the site (the big PNGs) live in
 * image-src/ and are never shipped. Originals that ARE used directly on the site
 * (logo, pre-loader) stay in public/images/ and just get a WebP companion.
 */
const TASKS = [
  { src: 'image-src/hero-1.png',         name: 'hero-1',     jpg: true,  webp: true,  mobileCrop: true },
  { src: 'image-src/mid-page.png',       name: 'mid-page',   jpg: false, webp: true },
  { src: 'public/images/logo.png',       name: 'logo',       jpg: false, webp: true, alpha: true },
  { src: 'public/images/pre-loader.png', name: 'pre-loader', jpg: false, webp: true, alpha: true },
]

const fmtKB = b => (b / 1024).toFixed(1) + ' KB'

async function build(task) {
  const srcPath  = join(ROOT, task.src)
  const pipeline = sharp(srcPath).resize({ width: MAX_WIDTH, withoutEnlargement: true })
  console.log(`\n  ${task.name}  (${task.src})`)

  if (task.jpg) {
    const out = join(OUT_DIR, task.name + '.jpg')
    await pipeline.clone().jpeg({ quality: JPG_Q, mozjpeg: true }).toFile(out + '.tmp')
    await rename(out + '.tmp', out)
    console.log(`    JPG          ${fmtKB((await stat(out)).size).padStart(9)}`)
  }

  if (task.webp) {
    const out  = join(OUT_DIR, task.name + '.webp')
    const opts = task.alpha ? { quality: WEBP_Q, alphaQuality: 90 } : { quality: WEBP_Q }
    await pipeline.clone().webp(opts).toFile(out)
    console.log(`    WebP         ${fmtKB((await stat(out)).size).padStart(9)}`)
  }

  // Tight right-side crop around the character + ETH crystal so portrait phones
  // can frame the silhouette large instead of the full wide artwork.
  if (task.mobileCrop) {
    const meta = await sharp(srcPath).metadata()
    const left = Math.floor(meta.width * 0.58)
    const out  = join(OUT_DIR, task.name + '-mobile.webp')
    await sharp(srcPath)
      .extract({ left, top: 0, width: meta.width - left, height: meta.height })
      .webp({ quality: WEBP_Q })
      .toFile(out)
    console.log(`    Mobile WebP  ${fmtKB((await stat(out)).size).padStart(9)}  (character crop)`)
  }
}

async function run() {
  console.log(`Building ${TASKS.length} image set(s) → public/images/ …`)
  for (const task of TASKS) await build(task)
  console.log('\nDone.\n')
}

run().catch(err => { console.error(err); process.exit(1) })
