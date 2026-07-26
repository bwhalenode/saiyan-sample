import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function initTimeline(lenis) {
  const isMobile = window.innerWidth <= 900
  const revealActions = 'play reverse play reverse'
  const bindLiveSection = selector => {
    const section = document.querySelector(selector)
    if (!section) return

    ScrollTrigger.create({
      trigger: section,
      start: 'top 72%',
      end: 'bottom 18%',
      onEnter: () => section.classList.add('is-live'),
      onEnterBack: () => section.classList.add('is-live'),
      onLeave: () => section.classList.remove('is-live'),
      onLeaveBack: () => section.classList.remove('is-live'),
    })
  }

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

  document.querySelectorAll('.nav__links a[href^="#"], .nav__socials a[href^="#"], .nav__brand[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href')
      const target = document.querySelector(href)
      if (!target) return

      e.preventDefault()
      const visibleOffset = href === '#about' && !isMobile ? window.innerHeight * 0.24 : 0
      lenis.scrollTo(target.offsetTop + visibleOffset)
    })
  })

  /* Canvas fade out as hero exits */
  gsap.to('#hero-canvas', {
    opacity: 0,
    scrollTrigger: {
      trigger:  '#about',
      start:    'top 60%',
      end:      'top 0%',
      scrub:    1,
    },
  })

  /* Scroll indicator: one consistent component on every viewport. Visible
         from the top, fades out as soon as the footer scrolls into view. */
  const scrollHint = document.getElementById('scroll-hint')
  const footerEl   = document.getElementById('footer')
  if (scrollHint && footerEl) {
    const hintIO = new IntersectionObserver(([entry]) => {
      scrollHint.classList.toggle('is-hidden', entry.isIntersecting)
    }, { threshold: 0 })
    hintIO.observe(footerEl)

    // Clickable cue, anchor to the first section below the fold (UX best practice)
    scrollHint.addEventListener('click', () => {
      const about = document.getElementById('about')
      if (!about) return
      const visibleOffset = !isMobile ? window.innerHeight * 0.24 : 0
      lenis.scrollTo(about.offsetTop + visibleOffset)
    })
  }

  /* Inflection quote: words strike in on scroll, lit by a lightning flash */
  const inflectionTitle = document.querySelector('.inflection__title')
  if (inflectionTitle && !inflectionTitle.dataset.split) {
    inflectionTitle.innerHTML = inflectionTitle.textContent.trim().split(/\s+/)
      .map(w => `<span class="inflection__word">${w}</span>`)
      .join(' ')
    inflectionTitle.dataset.split = '1'
  }

  // Keep the lightning alive only while the quote section is active.
  const inflectionFlash = document.querySelector('.inflection__flash')
  const inflectionSection = document.getElementById('inflection')
  let inflectionStrike
  const strike = () => {
    if (!inflectionFlash) return
    inflectionStrike?.kill()
    inflectionStrike = gsap.timeline()
      .set(inflectionFlash, { opacity: 0 })
      .to(inflectionFlash, { opacity: 0.95, duration: 0.06, ease: 'none' })
      .to(inflectionFlash, { opacity: 0.1,  duration: 0.07, ease: 'none' })
      .to(inflectionFlash, { opacity: 0.7,  duration: 0.05, ease: 'none' })
      .to(inflectionFlash, { opacity: 0,    duration: 0.55, ease: 'power2.out' })
  }
  const startInflectionLightning = () => {
    inflectionSection?.classList.add('is-live')
    strike()
  }
  const stopInflectionLightning = () => {
    inflectionSection?.classList.remove('is-live')
    inflectionStrike?.kill()
    if (inflectionFlash) gsap.set(inflectionFlash, { opacity: 0 })
  }

  const inflectionTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#inflection',
      start:   isMobile ? 'top 56%' : 'top 52%',
      end:     'bottom 18%',
      toggleActions: revealActions,
      onEnter:     startInflectionLightning,
      onEnterBack: startInflectionLightning,
      onLeave:     stopInflectionLightning,
      onLeaveBack: stopInflectionLightning,
    },
  })

  inflectionTl.fromTo('.inflection__word',
    {
      opacity: 0,
      yPercent: 70,
      scale: 0.94,
      filter: 'blur(14px) brightness(2.6)',
      textShadow: '0 0 28px rgba(74,216,255,0.85), 0 0 44px rgba(255,210,48,0.35)',
    },
    {
      opacity: 1,
      yPercent: 0,
      scale: 1,
      filter: 'blur(0px) brightness(1)',
      textShadow: '0 0 18px rgba(255,210,48,0.34), 0 0 18px rgba(74,216,255,0.12)',
      duration: isMobile ? 0.48 : 0.56,
      stagger: { each: isMobile ? 0.045 : 0.055, from: 'center' },
      ease: 'power3.out',
    },
    0.04,
  )
  inflectionTl.fromTo('.inflection__attribution',
    { opacity: 0, y: 18, filter: 'blur(8px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65, ease: 'power2.out' },
    '>-0.15',
  )

  /* Tokenomics title entrance */
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
        end:     'bottom 20%',
        toggleActions: revealActions,
      },
    },
  )

  /* Token cards entrance + shockwave */
  const cards = document.querySelectorAll('.token-card')
  cards.forEach((card, i) => {
    const shockwave = card.querySelector('.token-card__shockwave')
    const playShockwave = () => {
      gsap.fromTo(shockwave,
        { scale: 0.5, opacity: 1 },
        { scale: 2.5, opacity: 0, duration: 0.9, ease: 'power2.out', delay: i * 0.12 },
      )
    }

    gsap.to(card, {
      opacity:  1,
      scale:    1,
      duration: 0.6,
      ease:     'back.out(1.4)',
      delay:    i * 0.12,
      scrollTrigger: {
        trigger: '#tokenomics',
        start:   'top 65%',
        end:     'bottom 20%',
        toggleActions: revealActions,
        onEnter: playShockwave,
        onEnterBack: playShockwave,
      },
    })
  })

  /* How to Buy title */
  gsap.to('.htb__section-title', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#howtobuy',
      start:   isMobile ? 'top 86%' : 'top 75%',
      end:     'bottom 18%',
      toggleActions: revealActions,
    },
  })

  /* HTB step cards fade up out of the dark, one after another */
  gsap.fromTo('.htb__step',
    { opacity: 0, y: 64, scale: 0.95 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      stagger: isMobile ? 0.14 : 0.18,
      duration: isMobile ? 0.8 : 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.htb__steps',
        start:   isMobile ? 'top 92%' : 'top 85%',
        end:     'bottom 20%',
        toggleActions: revealActions,
      },
    },
  )

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
          end:     'bottom 18%',
          toggleActions: revealActions,
        },
      },
    )
  }

  bindLiveSection('#howtobuy')

  /* HTB lightning connector line draw */
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

  /* HTB CA repeat */
  gsap.to('.htb__ca-repeat', {
    opacity: 1,
    duration: 0.6,
    scrollTrigger: {
      trigger: '#howtobuy',
      start:   'bottom 80%',
      end:     'bottom 10%',
      toggleActions: revealActions,
    },
  })

  /* Game invite */
  const gameTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#game',
      start:   'top 72%',
      end:     'bottom 16%',
      toggleActions: revealActions,
    },
  })

  gameTl.fromTo('.game-invite__copy',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
  )
  gameTl.fromTo('.game-invite__visual',
    { opacity: 0, y: 70, scale: 0.94 },
    { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' },
    0.15,
  )
  bindLiveSection('#game')

  /* Creator reveal + active energy */
  const creatorTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#creator',
      start:   isMobile ? 'top 78%' : 'top 70%',
      end:     'bottom 14%',
      toggleActions: revealActions,
    },
  })

  creatorTl.fromTo('.creator__intro',
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 0.85, ease: 'power3.out' },
  )
  creatorTl.fromTo('.creator__forge',
    { opacity: 0, y: 70, scale: 0.96 },
    { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' },
    0.16,
  )
  bindLiveSection('#creator')

  /* Footer CTA */
  gsap.to('.footer__cta', {
    opacity: 1,
    scale:   1,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '#footer',
      start:   'top 70%',
      end:     'bottom 10%',
      toggleActions: revealActions,
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
      end:     'bottom 10%',
      toggleActions: revealActions,
    },
  })

  gsap.to(['.footer__ca', '.footer__socials', '.footer__disclaimer', '.footer__rights'], {
    opacity: 1,
    stagger: 0.15,
    duration: 0.6,
    scrollTrigger: {
      trigger: '#footer',
      start:   'top 50%',
      end:     'bottom 10%',
      toggleActions: revealActions,
    },
  })

  /* Music / soundtrack: heading + tracks come alive on scroll */
  gsap.fromTo('.music__head',
    { opacity: 0, y: 40 },
    {
      opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '#music', start: 'top 75%', end: 'bottom 12%', toggleActions: revealActions },
    },
  )

  gsap.fromTo('.music__track',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: '#music', start: 'top 72%', end: 'bottom 12%', toggleActions: revealActions },
    },
  )

  ScrollTrigger.refresh()
}
