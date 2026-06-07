import gsap from 'gsap'

const CA = '0x1f7566299f6111a0d492f473bdbe4a1ebd9cef56'
const isMob = () => window.innerWidth < 900

export function initHero() {
  /* Hero CA reveal + copy */
  const caWrap  = document.getElementById('hero-ca-bar')
  const trigger = document.getElementById('ca-trigger')
  const panel   = document.getElementById('ca-panel')
  const btn     = document.getElementById('ca-copy')
  const addrEl  = document.getElementById('ca-address')
  const label   = btn?.querySelector('.hero__ca-copy-label')

  if (addrEl) addrEl.textContent = CA

  trigger?.addEventListener('click', () => {
    if (!caWrap) return
    const open = !caWrap.classList.contains('is-open')
    caWrap.classList.toggle('is-open', open)
    trigger.setAttribute('aria-expanded', String(open))
    panel?.setAttribute('aria-hidden', String(!open))
  })

  btn?.addEventListener('click', () => {
    navigator.clipboard.writeText(CA).then(() => {
      if (label) label.textContent = 'COPIED'
      setTimeout(() => { if (label) label.textContent = 'COPY' }, 1400)
    })
  })
}

/**
 * Cinematic reveal sequence:
 *   1. Camera dollies in (2 s)
 *   2. "SUPER" wipes up (0.6 s before dolly ends)
 *   3. "SAIYAN" wipes up 0.2 s after SUPER
 *   4. CA bar fades in 0.4 s after SAIYAN finishes
 *   5. Nav fades in alongside the dolly start
 */
export function revealHero(scene) {
  return new Promise(resolve => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      gsap.set(['#hero-line-1', '#hero-line-2'], { y: 0 })
      gsap.set(['#hero-ca-bar', '#hero-anthem-wrap'], { opacity: 1, y: 0 })
      document.getElementById('scroll-hint')?.classList.add('is-visible')
      resolve()
      return
    }

    const cam  = scene?.getCamera()
    const tl   = gsap.timeline({ onComplete: resolve })

    /* Nav fades in (cascade) — opacity only, so items never read as vertically
       misaligned mid-stagger. The whole bar drops in together below. */
    tl.from('.nav', { opacity: 0, y: -14, duration: 0.6, ease: 'power2.out' }, 0)
    tl.from('.nav__brand, .nav__links a, .nav__socials a', {
      opacity: 0,
      stagger: 0.05,
      duration: 0.5,
      ease: 'power2.out',
    }, 0.05)

    const mobile = isMob()
    const lineStart = mobile ? 0.45 : 1.4

    /* Camera dolly: from z=4.8 → z=4 */
    if (cam) {
      tl.to(cam.position, {
        z: 4,
        duration: mobile ? 1.35 : 2,
        ease: 'power3.out',
      }, 0)
    }

    /* "SUPER" — starts 1.4 s into dolly (0.6 s overlap with end) */
    tl.to('#hero-line-1', {
      y: 0,
      duration: 0.9,
      ease: 'power4.out',
    }, lineStart)

    /* "SAIYAN" — 0.2 s after SUPER starts */
    tl.to('#hero-line-2', {
      y: 0,
      duration: 0.9,
      ease: 'power4.out',
    }, '+=0.2')

    /* Hero CA circle + anthem toggle — 0.4 s after SAIYAN animation finishes */
    tl.to(['#hero-ca-bar', '#hero-anthem-wrap'], {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
    }, '+=0.4')

    /* Scroll indicator enters with the CA circle, then stays visible until the
       footer observer in timeline.js hides it. */
    tl.call(() => {
      document.getElementById('scroll-hint')?.classList.add('is-visible')
    }, null, '<')
  })
}
