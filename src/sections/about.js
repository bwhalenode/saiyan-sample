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

  // Reduced motion: CSS already shows the copy as a normal readable stack.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initParticles()
    return
  }

  // The whole origin story reads on one screen. As the section moves through
  // the viewport, the eyebrow, logo, and paragraphs fade/stagger together.
  gsap.set(eyebrow, { opacity: 0, y: 18 })
  gsap.set(paras,   { opacity: 0, y: 24 })
  gsap.set(imgCol,  { opacity: 0, x: mob ? 0 : '14%', y: mob ? 26 : 0 })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start:   'top 68%',
      end:     'bottom 18%',
      toggleActions: 'play reverse play reverse',
    },
  })

  tl.to(imgCol,  { opacity: 1, x: '0%', y: 0, duration: 0.8, ease: 'power3.out' }, 0)
  tl.to(eyebrow, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 0.1)
  tl.to(paras,   { opacity: 1, y: 0, duration: 0.55, stagger: 0.12, ease: 'power2.out' }, 0.18)

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
