import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const isMob = () => window.innerWidth < 768

export function initAbout() {
  const section = document.getElementById('about')
  const textEl  = document.getElementById('about-text')
  const eyebrow = document.querySelector('.about__eyebrow')
  const imgCol  = document.querySelector('.about__image-col')

  if (!section || !textEl) return

  const paras = Array.from(textEl.querySelectorAll('p'))

  const tl = gsap.timeline()

  // Eyebrow, text, and rage-face move as one beat so the section feels connected.
  tl.fromTo(eyebrow,
    { opacity: 0, y: 18 },
    { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
    0
  )
  tl.fromTo(imgCol,
    { x: isMob() ? '18%' : '42%', y: isMob() ? 28 : 0, opacity: 0 },
    { x: '0%', y: 0, opacity: 1, duration: 0.34, ease: 'power2.out' },
    0
  )
  tl.fromTo(paras, {
    opacity: 0,
    y: 24,
  }, {
    opacity: 1,
    y: 0,
    duration: 0.14,
    stagger: 0.045,
    ease: 'power2.out',
  }, 0.06)

  // Exit later, after the reveal has had a short readable hold.
  tl.to(imgCol, { y: '-70%', opacity: 0, duration: 0.22, ease: 'power2.in' }, 0.78)

  tl.to([textEl, eyebrow], { opacity: 0, duration: 0.16 }, 0.84)

  ScrollTrigger.create({
    trigger: section,
    start:   'top top',
    end:     () => '+=' + (isMob() ? window.innerHeight * 0.85 : window.innerHeight * 1.05),
    pin:     true,
    scrub:   0.65,
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
