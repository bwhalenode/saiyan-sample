import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initTimeline(lenis) {
  const isMobile = window.innerWidth <= 900

  // Let Lenis proxy scroll for ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update)

  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) {
        lenis.scrollTo(value, { immediate: true })
      }
      return lenis.scroll
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
    },
    pinType: document.body.style.transform ? 'transform' : 'fixed',
  })

  document.querySelectorAll('.nav__links a[href^="#"], .nav__brand[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href')
      const target = document.querySelector(href)
      if (!target) return

      e.preventDefault()
      const visibleOffset = href === '#about' && !isMobile ? window.innerHeight * 0.24 : 0
      lenis.scrollTo(target.offsetTop + visibleOffset)
    })
  })

  /* ─── Canvas fade out as hero exits ─── */
  gsap.to('#hero-canvas', {
    opacity: 0,
    scrollTrigger: {
      trigger:  '#about',
      start:    'top 60%',
      end:      'top 0%',
      scrub:    1,
    },
  })

  if (isMobile) {
    gsap.to('#scroll-hint', {
      opacity: 0,
      y: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start:   'top top',
        end:     'bottom 70%',
        scrub:   0.4,
      },
    })
  }

  /* ─── Inflection title reveal ─── */
  gsap.to('.inflection__title', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#inflection',
      start:   'top 65%',
    },
  })

  /* ─── Tokenomics title entrance ─── */
  gsap.fromTo('.tokenomics__title',
    { opacity: 0, y: 60 },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '#tokenomics',
        start:   'top 75%',
      },
    },
  )

  /* ─── Token cards entrance + shockwave ─── */
  const cards = document.querySelectorAll('.token-card')
  cards.forEach((card, i) => {
    const shockwave = card.querySelector('.token-card__shockwave')

    gsap.to(card, {
      opacity:  1,
      scale:    1,
      duration: 0.6,
      ease:     'back.out(1.4)',
      delay:    i * 0.12,
      scrollTrigger: {
        trigger: '#tokenomics',
        start:   'top 65%',
        onEnter: () => {
          gsap.fromTo(shockwave,
            { scale: 0.5, opacity: 1 },
            { scale: 2.5, opacity: 0, duration: 0.9, ease: 'power2.out', delay: i * 0.12 },
          )
        },
      },
    })
  })

  /* ─── How to Buy title ─── */
  gsap.to('.htb__section-title', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#howtobuy',
      start:   isMobile ? 'top 86%' : 'top 75%',
    },
  })

  /* ─── HTB steps stagger ─── */
  gsap.to('.htb__step', {
    opacity: 1,
    y: 0,
    stagger: isMobile ? 0.14 : 0.18,
    duration: isMobile ? 0.72 : 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#howtobuy',
      start:   isMobile ? 'top 78%' : 'top 65%',
    },
  })

  if (isMobile) {
    gsap.fromTo('.htb__step-icon',
      { opacity: 0, y: 12, scale: 0.92 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.12,
        duration: 0.55,
        ease: 'back.out(1.35)',
        scrollTrigger: {
          trigger: '#howtobuy',
          start:   'top 74%',
        },
      },
    )
  }

  /* ─── HTB lightning connector line draw ─── */
  gsap.to('#htb-line', {
    strokeDashoffset: 0,
    ease:   'power1.inOut',
    scrollTrigger: {
      trigger: '#howtobuy',
      start:   'top 60%',
      end:     'center 40%',
      scrub:   1,
    },
  })

  /* ─── HTB CA repeat ─── */
  gsap.to('.htb__ca-repeat', {
    opacity: 1,
    duration: 0.6,
    scrollTrigger: {
      trigger: '#howtobuy',
      start:   'bottom 80%',
    },
  })

  /* ─── Footer CTA ─── */
  gsap.to('.footer__cta', {
    opacity: 1,
    scale:   1,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#footer',
      start:   'top 70%',
    },
  })

  gsap.to('.footer__buy-btn', {
    opacity: 1,
    duration: 0.8,
    ease: 'power2.out',
    delay: 0.3,
    scrollTrigger: {
      trigger: '#footer',
      start:   'top 70%',
    },
  })

  gsap.to(['.footer__ca', '.footer__socials', '.footer__disclaimer', '.footer__rights'], {
    opacity: 1,
    stagger: 0.15,
    duration: 0.6,
    scrollTrigger: {
      trigger: '#footer',
      start:   'top 50%',
    },
  })

  ScrollTrigger.refresh()
}
