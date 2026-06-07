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
import { initTeam }        from './sections/team.js'
import { initMusic }       from './sections/music.js'
import { initFooter }      from './sections/footer.js'

gsap.registerPlugin(ScrollTrigger)

async function bootstrap() {
  const lenis  = initLenis()

  const canvas = document.getElementById('hero-canvas')

  // The preloader runs its own timed reveal animation and calls onComplete when
  // it finishes; finishInit() then takes over and reveals the hero.
  const preloader = new AsciiPreloader({
    onComplete: () => finishInit(lenis, scene),
  })

  // Create scene (constructor only sets up the renderer; no textures yet).
  const scene = new HeroScene(canvas)

  // Start the preloader's visual reveal.
  preloader.start()

  // Load the WebGL textures while the preloader plays. We intentionally do NOT
  // await this here — the preloader's own animation gates when finishInit runs,
  // and the scene is ready well before that. Errors are logged, not fatal.
  preloadImages(['/images/logo.webp', '/images/logo.png'])
  scene.load().catch(err => console.error('[SAIYAN] Scene load error:', err))
}

async function finishInit(lenis, scene) {
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
  initTeam()
  initMusic()
  initFooter()

  // Register all scroll-driven animations
  initTimeline(lenis)
}

function preloadImages(srcs) {
  srcs.forEach(src => { const img = new Image(); img.src = src })
}

bootstrap().catch(err => {
  console.error('[SAIYAN] Init error:', err)
  document.querySelector('.preloader')?.remove()
})
