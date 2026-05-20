import gsap from 'gsap'

export function initHero() {
  /* Contract address copy */
  const btn     = document.getElementById('ca-copy')
  const addrEl  = document.getElementById('ca-address')
  const label   = btn?.querySelector('.hero__ca-copy-label')

  btn?.addEventListener('click', () => {
    navigator.clipboard.writeText(addrEl.textContent.trim()).then(() => {
      if (label) label.textContent = 'COPIED!'
      setTimeout(() => { if (label) label.textContent = 'COPY' }, 2000)
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

/* Called by preloader completion sequence */
export function revealHero() {
  return new Promise(resolve => {
    const tl = gsap.timeline({ onComplete: resolve })

    tl.to('.hero__headline', {
      clipPath: 'inset(0 0 0% 0)',
      duration: 1.1,
      ease: 'power4.out',
    })
    .from('.hero__ca-bar', {
      opacity: 0,
      y: 20,
      duration: 0.7,
      ease: 'power3.out',
    }, '-=0.5')
    .from('.hero__scroll-hint', {
      opacity: 0,
      y: 10,
      duration: 0.6,
    }, '-=0.3')
    .from('.nav__brand, .nav__links a', {
      opacity: 0,
      y: -10,
      stagger: 0.06,
      duration: 0.5,
    }, '<')
  })
}
