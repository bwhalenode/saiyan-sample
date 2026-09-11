import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { AsciiPreloader } from './preloader/AsciiPreloader.js'
import { initLenis } from './scroll/lenis.js'
import { HeroScene } from './scene/HeroScene.js'
import { initTimeline } from './scroll/timeline.js'
import { initHero, revealHero } from './sections/hero.js'
import { initAbout } from './sections/about.js'
import { initTokenomics } from './sections/tokenomics.js'
import { initTeam } from './sections/team.js'
import { initMusic } from './sections/music.js'
import { initHeroAnthem, startHeroAnthem } from './sections/hero-anthem.js'
import { initBuy } from './sections/buy.js'
import { initHallRoute } from './sections/hall-route.js'

gsap.registerPlugin(ScrollTrigger)

async function bootstrap() {
  const lenis = initLenis()

  const canvas = document.getElementById('hero-canvas')

  // The preloader runs its own timed reveal animation and calls onComplete when
  // it finishes; finishInit() then takes over and reveals the hero.
  const preloader = new AsciiPreloader({
    onAwaken: () => startHeroAnthem(), // play the anthem out loud on the tap gesture
    onComplete: () => finishInit(lenis, scene),
  })

  // Set up the scene before loading its textures asynchronously.
  const scene = new HeroScene(canvas)

  preloader.start()

  // Load textures alongside the preloader. The reveal does not await this promise.
  preloadImages(['/images/logo.webp', '/images/logo.png'])
  scene.load().catch((err) => console.error('[SAIYAN] Scene load error:', err))
}

async function finishInit(lenis, scene) {
  // Render during the reveal so the camera dolly is visible.
  function loop(ts) {
    scene.update(ts / 1000)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  // Anthem already started on the preloader tap; wire the mute/unmute button.
  initHeroAnthem()

  await revealHero(scene)

  initHero()
  initAbout()
  initTokenomics()
  initTeam()
  initMusic()
  initBuy()
  // Opens the Hall in place, so the soundtrack is never cut by a page load.
  initHallRoute(lenis)

  initTimeline(lenis)
}

function preloadImages(srcs) {
  srcs.forEach((src) => {
    const img = new Image()
    img.src = src
  })
}

bootstrap().catch((err) => {
  console.error('[SAIYAN] Init error:', err)
  document.querySelector('.preloader')?.remove()
})
