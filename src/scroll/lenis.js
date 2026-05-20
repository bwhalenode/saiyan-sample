import Lenis from 'lenis'
import gsap  from 'gsap'

export function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 1.8,
    infinite: false,
  })

  // Keep ScrollTrigger in sync with Lenis
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  return lenis
}
