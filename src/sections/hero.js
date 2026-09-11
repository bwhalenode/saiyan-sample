import gsap from 'gsap'
import { initCaBar } from './ca-bar.js'
const isMob = () => window.innerWidth < 900

export function initHero() {
  // CA circle behaviour is shared with the Hall page.
  initCaBar()
}

/**
 * Cinematic reveal sequence:
 *   1. Camera dollies in (shorter on mobile)
 *   2. "SUPER" wipes up during the dolly
 *   3. "SAIYAN" wipes up 0.2 s after the preceding animation ends
 *   4. Audio circle wakes immediately; CA bar fades in after SAIYAN finishes
 *   5. Nav fades in alongside the dolly start
 */
export function revealHero(scene) {
  return new Promise((resolve) => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      gsap.set(['#hero-line-1', '#hero-line-2'], { y: 0 })
      gsap.set(['#hero-ca-bar', '#hero-anthem-wrap'], { opacity: 1, y: 0 })
      document.getElementById('scroll-hint')?.classList.add('is-visible')
      resolve()
      return
    }

    const cam = scene?.getCamera()
    const tl = gsap.timeline({ onComplete: resolve })

    /* Nav fades in (cascade), opacity only, so items never read as vertically
       misaligned mid-stagger. The whole bar drops in together below. */
    tl.from('.nav', { opacity: 0, y: -14, duration: 0.6, ease: 'power2.out' }, 0)
    tl.from(
      '.nav__brand, .nav__links a, .nav__socials a',
      {
        opacity: 0,
        stagger: 0.05,
        duration: 0.5,
        ease: 'power2.out',
      },
      0.05,
    )

    const mobile = isMob()
    const lineStart = mobile ? 0.45 : 1.4

    /* Camera dolly: from z=4.8 → z=4 */
    if (cam) {
      tl.to(
        cam.position,
        {
          z: 4,
          duration: mobile ? 1.35 : 2,
          ease: 'power3.out',
        },
        0,
      )
    }

    /* Audio circle comes alive immediately after the preloader shockwave handoff.
       The CA button still waits until the title lands. */
    tl.to(
      '#hero-anthem-wrap',
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: 'power3.out',
      },
      0.12,
    )

    // The title starts earlier on mobile.
    tl.to(
      '#hero-line-1',
      {
        y: 0,
        duration: 0.9,
        ease: 'power4.out',
      },
      lineStart,
    )

    // Leave 0.2 seconds after the preceding animation ends.
    tl.to(
      '#hero-line-2',
      {
        y: 0,
        duration: 0.9,
        ease: 'power4.out',
      },
      '+=0.2',
    )

    /* Hero CA circle, 0.4 s after SAIYAN animation finishes */
    tl.to(
      '#hero-ca-bar',
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power3.out',
      },
      '+=0.4',
    )

    /* Scroll indicator enters with the CA circle, then stays visible until the
       footer observer in timeline.js hides it. */
    tl.call(
      () => {
        document.getElementById('scroll-hint')?.classList.add('is-visible')
      },
      null,
      '<',
    )
  })
}
