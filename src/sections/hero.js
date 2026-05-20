import gsap from 'gsap'

const CA = '0x1f7566299f6111a0d492f473bdbe4a1ebd9cef56'

export function initHero() {
  /* Mobile CA bar copy */
  const btn    = document.getElementById('ca-copy')
  const addrEl = document.getElementById('ca-address')
  const label  = btn?.querySelector('.hero__ca-copy-label')

  btn?.addEventListener('click', () => {
    navigator.clipboard.writeText(CA).then(() => {
      if (label) label.textContent = 'COPIED!'
      setTimeout(() => { if (label) label.textContent = 'COPY' }, 2000)
    })
  })

  /* Desktop CA vertical strip copy */
  const caDesktop     = document.getElementById('ca-desktop')
  const caDesktopText = caDesktop?.querySelector('.ca-desktop__text')
  const CA_DEFAULT    = `CA · ${CA} · CLICK TO COPY`
  const CA_COPIED     = `CA · ${CA} · COPIED`

  caDesktop?.addEventListener('click', () => {
    navigator.clipboard.writeText(CA).then(() => {
      if (caDesktopText) caDesktopText.textContent = CA_COPIED
      setTimeout(() => {
        if (caDesktopText) caDesktopText.textContent = CA_DEFAULT
      }, 1200)
    })
  })

  /* Mobile nav burger */
  const burger   = document.getElementById('nav-burger')
  const navLinks = document.getElementById('nav-links')

  burger?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('is-open')
    burger.classList.toggle('is-active', open)
    burger.setAttribute('aria-expanded', String(open))
    document.body.style.overflow = open ? 'hidden' : ''
  })

  navLinks?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('is-open')
      burger?.classList.remove('is-active')
      burger?.setAttribute('aria-expanded', 'false')
      document.body.style.overflow = ''
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
      gsap.set('#hero-ca-bar', { opacity: 1, y: 0 })
      gsap.set('#ca-desktop', { opacity: 1 })
      resolve()
      return
    }

    const cam  = scene?.getCamera()
    const tl   = gsap.timeline({ onComplete: resolve })

    /* Nav slides down while the dolly plays */
    tl.from('.nav__brand, .nav__links a, .nav__burger', {
      opacity: 0,
      y: -14,
      stagger: 0.05,
      duration: 0.6,
      ease: 'power2.out',
    }, 0)

    /* Camera dolly: from z=4.8 → z=4 */
    if (cam) {
      tl.to(cam.position, {
        z: 4,
        duration: 2,
        ease: 'power3.out',
      }, 0)
    }

    /* "SUPER" — starts 1.4 s into dolly (0.6 s overlap with end) */
    tl.to('#hero-line-1', {
      y: 0,
      duration: 0.9,
      ease: 'power4.out',
    }, 1.4)

    /* "SAIYAN" — 0.2 s after SUPER starts */
    tl.to('#hero-line-2', {
      y: 0,
      duration: 0.9,
      ease: 'power4.out',
    }, '+=0.2')

    /* Mobile CA bar — 0.4 s after SAIYAN animation finishes */
    tl.to('#hero-ca-bar', {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
    }, '+=0.4')

    /* Desktop CA strip — same beat */
    tl.to('#ca-desktop', {
      opacity: 1,
      duration: 0.7,
      ease: 'power3.out',
    }, '<')

    /* Scroll hint fades in alongside CA bar */
    tl.from('#scroll-hint', {
      opacity: 0,
      y: 8,
      duration: 0.6,
      ease: 'power2.out',
    }, '<')
  })
}
