import './style.css'
import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { AsciiPreloader }  from './preloader/AsciiPreloader.js'
import { initLenis }       from './scroll/lenis.js'
import { HeroScene }       from './scene/HeroScene.js'
import { initTimeline }    from './scroll/timeline.js'
import { initHero, revealHero } from './sections/hero.js'
import { initAbout }       from './sections/about.js'
import { initTokenomics }  from './sections/tokenomics.js'
import { initHowToBuy }    from './sections/howtobuy.js'
import { initFooter }      from './sections/footer.js'

gsap.registerPlugin(ScrollTrigger)

async function bootstrap() {
  const lenis  = initLenis()

  const canvas = document.getElementById('hero-canvas')

  // Preloader must be constructed BEFORE HeroScene so DefaultLoadingManager
  // callbacks are registered before any texture loads begin.
  const preloader = new AsciiPreloader({
    onComplete: () => finishInit(lenis, scene),
  })

  // Create scene (may trigger top-level-await WebP probe, not a texture load)
  const scene = new HeroScene(canvas)

  // Start the preloader visual reveal
  preloader.start()

  // Kick off assets in the background — DefaultLoadingManager fires events
  preloadImages(['/images/rage-face.webp', '/images/rage-face.jpg'])
  scene.load().catch(err => console.error('[SAIYAN] Scene load error:', err))
}

async function finishInit(lenis, scene) {
  console.log('[main] finishInit called')
  // Start render loop BEFORE cinematic reveal so the dolly is visible
  function loop(ts) {
    scene.update(ts / 1000)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  // Cinematic reveal: camera dolly + staggered title wipe
  await revealHero(scene)

  // Boot sections
  initHero()
  initAbout()
  initTokenomics()
  initHowToBuy()
  initFooter()

  // Register all scroll-driven animations
  initTimeline(lenis, scene)
}

function preloadImages(srcs) {
  srcs.forEach(src => { const img = new Image(); img.src = src })
}

bootstrap().catch(err => {
  console.error('[SAIYAN] Init error:', err)
  document.querySelector('.preloader')?.remove()
})
