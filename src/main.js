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

/* ── prefers-reduced-motion guard ── */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

async function bootstrap() {
  /* ── Init Lenis smooth scroll ── */
  const lenis = initLenis()

  /* ── Init custom cursor ── */
  initCursor()

  /* ── Boot Three.js scene ── */
  const canvas = document.getElementById('hero-canvas')
  const scene  = new HeroScene(canvas)

  /* ── Preloader ── */
  const bar = document.getElementById('preloader-bar')

  if (prefersReduced) {
    // Skip animated preloader for reduced-motion
    document.getElementById('preloader').style.display = 'none'
    finishInit(lenis, scene)
    return
  }

  // Simulate loading with texture load progress
  await scene.load((progress) => {
    if (bar) bar.style.width = (progress * 100) + '%'
  })

  // Brief pause so 100% is visible
  await sleep(300)

  /* ── Preloader exit: flash white → reveal ── */
  const preloader = document.getElementById('preloader')
  const flash     = document.getElementById('flash-overlay')

  await new Promise(resolve => {
    gsap.timeline({ onComplete: resolve })
      .to(preloader, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.in',
      })
      .set(preloader, { display: 'none' })
      .to(flash, {
        opacity: 1,
        duration: 0.08,
      })
      .to(flash, {
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
      })
  })

  finishInit(lenis, scene)
}

async function finishInit(lenis, scene) {
  /* ── Hero reveal ── */
  await revealHero()

  /* ── Init sections ── */
  initHero()
  initAbout()
  initTokenomics()
  initHowToBuy()
  initFooter()

  /* ── Scroll timeline ── */
  initTimeline(lenis, scene)

  /* ── Render loop ── */
  let last = 0
  function loop(ts) {
    const t = ts / 1000
    scene.update(t)
    last = t
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

bootstrap().catch(err => {
  console.error('[SAIYAN] Init error:', err)
  // Fail gracefully: hide preloader and show page
  document.getElementById('preloader')?.remove()
  document.getElementById('flash-overlay')?.remove()
})
