import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* Split paragraph text into word spans for scroll-driven reveal */
function splitWords(container) {
  const paras = container.querySelectorAll('p')
  paras.forEach(p => {
    const words = p.innerHTML.split(/(\s+)/)
    p.innerHTML = words.map(w => {
      if (!w.trim()) return w
      return `<span class="word"><span class="word-inner">${w}</span></span>`
    }).join('')
  })
}

export function initAbout() {
  const textEl  = document.getElementById('about-text')
  const imgWrap = document.getElementById('about-img')
  const eyebrow = document.querySelector('.about__eyebrow')

  if (!textEl) return

  splitWords(textEl)
  const wordInners = textEl.querySelectorAll('.word-inner')

  /* Eyebrow fade in */
  gsap.to(eyebrow, {
    opacity: 1,
    duration: 0.6,
    scrollTrigger: {
      trigger:  '#about',
      start:    'top 70%',
    },
  })

  /* Word-by-word reveal tied to scroll progress */
  gsap.to(wordInners, {
    y: 0,
    stagger: 0.04,
    ease: 'power2.out',
    duration: 0.5,
    scrollTrigger: {
      trigger: '#about',
      start:   'top 60%',
      end:     'center 30%',
      scrub:   0.8,
    },
  })

  /* Image slide in on enter, then parallax */
  gsap.to(imgWrap, {
    x: '0%',
    duration: 1.2,
    ease: 'power4.out',
    scrollTrigger: {
      trigger: '#about',
      start:   'top 80%',
    },
  })

  /* Gold particle field — 50 drifting dots */
  const canvas = document.getElementById('about-particles')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let W, H, dots, raf

  function resize() {
    W = canvas.width  = canvas.offsetWidth
    H = canvas.height = canvas.offsetHeight
  }

  function initDots() {
    dots = Array.from({ length: 50 }, () => ({
      x:    Math.random() * W,
      y:    Math.random() * H,
      r:    1 + Math.random() * 2.5,
      vx:   (Math.random() - 0.5) * 0.3,
      vy:   (Math.random() - 0.5) * 0.3,
      a:    0.1 + Math.random() * 0.5,
      da:   (Math.random() - 0.5) * 0.005,
    }))
  }

  function drawDots() {
    ctx.clearRect(0, 0, W, H)
    dots.forEach(d => {
      d.x += d.vx
      d.y += d.vy
      d.a += d.da
      if (d.a < 0.05 || d.a > 0.65) d.da *= -1
      if (d.x < 0)  d.x = W
      if (d.x > W)  d.x = 0
      if (d.y < 0)  d.y = H
      if (d.y > H)  d.y = 0

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
