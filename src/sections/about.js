import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const isMob = () => window.innerWidth <= 900

export function initAbout() {
  const section = document.getElementById('about')
  const textEl  = document.getElementById('about-text')
  const eyebrow = document.querySelector('.about__eyebrow')
  const imgCol  = document.querySelector('.about__image-col')

  if (!section || !textEl) return

  const paras = Array.from(textEl.querySelectorAll('p'))
  const mob   = isMob()

  // Reduced motion: skip the pinned carousel; CSS shows the copy as a normal
  // readable stack. Just kick off the ambient particles.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initParticles()
    return
  }

  // ── Frame: eyebrow + logo fade/slide in once and stay for the section ──
  const intro = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start:   'top 78%',
      toggleActions: 'play none none reverse',
    },
  })
  intro.fromTo(eyebrow,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
    0
  )
  intro.fromTo(imgCol,
    { opacity: 0, x: mob ? '0%' : '34%', y: mob ? 26 : 0 },
    { opacity: 1, x: '0%', y: 0, duration: 0.7, ease: 'power3.out' },
    0
  )

  // ── Paragraph carousel: strictly ONE line at a time ──
  // Each paragraph fades+slides in, holds, then fully fades out. The next one
  // only begins after a gap — so the previous line is at opacity 0 before the
  // next appears. The segments never overlap, so two are never visible at once.
  gsap.set(paras, { opacity: 0, y: 44 })

  const tl   = gsap.timeline()
  const dIn  = 0.5
  const hold = 0.8
  const dOut = 0.5
  const gap  = 0.3                       // empty beat between paragraphs
  const step = dIn + hold + dOut + gap   // full, non-overlapping segment

  paras.forEach((p, i) => {
    const t = i * step
    tl.fromTo(p,
      { opacity: 0, y: 44 },
      { opacity: 1, y: 0, duration: dIn, ease: 'power2.out' },
      t
    )
    // Keep the final line on screen as the section is scrolled past.
    if (i < paras.length - 1) {
      tl.to(p, { opacity: 0, y: -44, duration: dOut, ease: 'power2.in' }, t + dIn + hold)
    }
  })

  ScrollTrigger.create({
    trigger:   section,
    start:     'top top',
    end:       () => '+=' + window.innerHeight * (paras.length * (mob ? 0.6 : 0.7)),
    pin:       true,
    scrub:     mob ? 0.8 : 0.7,
    animation: tl,
  })

  initParticles()
}

function initParticles() {
  const canvas = document.getElementById('about-particles')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let W, H, dots, raf

  function resize() {
    W = canvas.width  = canvas.offsetWidth
    H = canvas.height = canvas.offsetHeight
  }

  function initDots() {
    dots = Array.from({ length: 30 }, () => ({
      x:  Math.random() * (W * 0.5),
      y:  Math.random() * H,
      r:  0.8 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      a:  0.1 + Math.random() * 0.45,
      da: (Math.random() - 0.5) * 0.004,
    }))
  }

  function drawDots() {
    ctx.clearRect(0, 0, W, H)
    dots.forEach(d => {
      d.x += d.vx
      d.y += d.vy
      d.a += d.da
      if (d.a < 0.05 || d.a > 0.55) d.da *= -1
      if (d.x < 0)         d.x = W * 0.5 - 1
      if (d.x > W * 0.5)   d.x = 0
      if (d.y < 0)         d.y = H
      if (d.y > H)         d.y = 0

      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 210, 48, ${d.a})`
      ctx.fill()
    })
    raf = requestAnimationFrame(drawDots)
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        resize()
        if (!dots) initDots()
        if (!raf) drawDots()
      } else {
        cancelAnimationFrame(raf)
        raf = null
      }
    })
  }, { rootMargin: '200px' })

  observer.observe(canvas)
  window.addEventListener('resize', () => { resize(); initDots() }, { passive: true })
}
