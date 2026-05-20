export function initFooter() {
  /* All animations triggered by timeline.js */
  /* Large background radial glow pulse */
  const footer = document.querySelector('.section--footer')
  if (!footer) return

  let hue = 0
  let raf

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        pulsate()
      } else {
        cancelAnimationFrame(raf)
        raf = null
      }
    })
  })
  obs.observe(footer)

  function pulsate() {
    hue += 0.3
    const size = 60 + Math.sin(hue * 0.015) * 8
    footer.style.setProperty(
      '--footer-glow',
      `radial-gradient(ellipse ${size}% ${size / 2}% at 50% 50%, rgba(255,210,48,0.04) 0%, transparent 70%)`
    )
    raf = requestAnimationFrame(pulsate)
  }
}
