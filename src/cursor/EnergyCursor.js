const isMouse = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

export function initCursor() {
  if (!isMouse()) return null

  const orb  = document.getElementById('cursor-orb')
  const ring = document.getElementById('cursor-ring')

  let orbX  = -100, orbY  = -100
  let ringX = -100, ringY = -100
  let curX  = -100, curY  = -100
  let raf

  document.addEventListener('mousemove', (e) => {
    curX = e.clientX
    curY = e.clientY
  })

  function animate() {
    // Orb follows cursor tightly
    orbX += (curX - orbX) * 0.45
    orbY += (curY - orbY) * 0.45

    // Ring lags behind
    ringX += (curX - ringX) * 0.12
    ringY += (curY - ringY) * 0.12

    orb.style.transform  = `translate(${orbX}px, ${orbY}px) translate(-50%, -50%)`
    ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`

    raf = requestAnimationFrame(animate)
  }
  animate()

  /* Hover states */
  function setHover(on) {
    orb.classList.toggle('is-hovering', on)
    ring.classList.toggle('is-hovering', on)
  }

  function setupTargets() {
    document.querySelectorAll('[data-cursor="hover"], a, button').forEach(el => {
      el.addEventListener('mouseenter', () => setHover(true))
      el.addEventListener('mouseleave', () => setHover(false))
    })
  }
  setupTargets()

  /* Click pulse */
  document.addEventListener('mousedown', () => {
    orb.classList.add('is-clicking')
    setTimeout(() => orb.classList.remove('is-clicking'), 350)
  })

  /* Magnetic hover utility */
  function magnetize(el, strength = 0.4) {
    const RANGE = 80

    el.addEventListener('mousemove', (e) => {
      const rect   = el.getBoundingClientRect()
      const cx     = rect.left + rect.width / 2
      const cy     = rect.top  + rect.height / 2
      const dx     = e.clientX - cx
      const dy     = e.clientY - cy
      const dist   = Math.sqrt(dx * dx + dy * dy)

      if (dist < RANGE) {
        const pull = (1 - dist / RANGE) * strength
        el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`
      }
    })

    el.addEventListener('mouseleave', () => {
      el.style.transform = ''
    })
  }

  /* Apply magnetic to key interactive elements */
  document.querySelectorAll('.nav__brand, .nav__links a, .footer__buy-btn').forEach(el => {
    magnetize(el, el.classList.contains('footer__buy-btn') ? 0.25 : 0.35)
  })

  return { setupTargets, magnetize }
}
