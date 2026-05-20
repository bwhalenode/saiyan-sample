import './style.css'
import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { initLenis }     from './scroll/lenis.js'
import { initCursor }    from './cursor/EnergyCursor.js'
import { HeroScene }     from './scene/HeroScene.js'
import { initTimeline }  from './scroll/timeline.js'
import { initHero, revealHero } from './sections/hero.js'
import { initAbout }     from './sections/about.js'
import { initTokenomics }from './sections/tokenomics.js'
import { initHowToBuy }  from './sections/howtobuy.js'
import { initFooter }    from './sections/footer.js'

gsap.registerPlugin(ScrollTrigger)

async function bootstrap() {
  const lenis  = initLenis()
  initCursor()

  const canvas = document.getElementById('hero-canvas')
  const scene  = new HeroScene(canvas)
  const bar    = document.getElementById('preloader-bar')

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    document.getElementById('preloader').style.display = 'none'
    finishInit(lenis, scene)
    return
  }

  // Kick off rage-face preload in parallel so About section is instant
  preloadImages(['/images/rage-face.webp', '/images/rage-face.jpg'])

  // Load textures + build scene; await so preloader waits for real readiness
  await scene.load((progress) => {
    if (bar) bar.style.width = (progress * 100) + '%'
  })

  // Brief pause so 100% is visible before exit animation
  await sleep(280)

  // Preloader exit: fade out → white flash → reveal
  const preloader = document.getElementById('preloader')
  const flash     = document.getElementById('flash-overlay')

  await new Promise(resolve => {
    gsap.timeline({ onComplete: resolve })
      .to(preloader, { opacity: 0, duration: 0.35, ease: 'power2.in' })
      .set(preloader, { display: 'none' })
      .to(flash, { opacity: 1, duration: 0.08 })
      .to(flash, { opacity: 0, duration: 0.5, ease: 'power2.out' })
  })

  finishInit(lenis, scene)
}

async function finishInit(lenis, scene) {
  // Hero cinematic reveal (dolly + staggered title wipe)
  await revealHero(scene)

  // Boot sections
  initHero()
  initAbout()
  initTokenomics()
  initHowToBuy()
  initFooter()

  // Register all scroll-driven animations
  initTimeline(lenis, scene)

  // Render loop
  function loop(ts) {
    scene.update(ts / 1000)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

function preloadImages(srcs) {
  srcs.forEach(src => {
    const img = new Image()
    img.src = src
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

bootstrap().catch(err => {
  console.error('[SAIYAN] Init error:', err)
  document.getElementById('preloader')?.remove()
  document.getElementById('flash-overlay')?.remove()
})
