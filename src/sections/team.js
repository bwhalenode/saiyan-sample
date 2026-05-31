import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const AUTO_SPEED   = 7     // degrees per second (slow spin)
const DEG_PER_PX   = 0.26  // drag sensitivity
const RESUME_DELAY = 3000  // ms idle before auto-spin resumes after interaction
const DRAG_THRESH  = 6     // px before a press becomes a drag

export function initTeam() {
  const section = document.getElementById('team')
  const stage   = section?.querySelector('.team__stage')
  const ring    = document.getElementById('team-ring')
  const cards   = Array.from(ring?.querySelectorAll('.team-card') || [])
  const arrows  = Array.from(section?.querySelectorAll('.team__arrow') || [])
  const dialog  = document.getElementById('team-dialog')

  if (!section || !stage || !ring || !cards.length) return

  const N       = cards.length
  const step    = 360 / N
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  const dImg  = dialog?.querySelector('.team-dialog__image')
  const dName = dialog?.querySelector('.team-dialog__name')

  let radius      = 440
  let rotation    = 0
  let target      = null
  let autoPaused  = false
  let resumeTimer = null
  let inView      = false
  let hovering    = false
  let pointerDown = false
  let dragging    = false
  let pointerId   = null
  let startX      = 0
  let startRot    = 0
  let dragDelta   = 0
  let raf         = null
  let prev        = performance.now()

  /* Place cards on the wall of a cylinder, facing INWARD toward the centre
     (translateZ is negative) so the viewer looks at it from the inside: the
     front card is on the far wall and the sides curve toward you. */
  function layout() {
    const w = cards[0].getBoundingClientRect().width || 240
    radius = Math.round((w * 1.18) / (2 * Math.tan(Math.PI / N)))
    cards.forEach((card, i) => {
      card.style.transform = `rotateY(${i * step}deg) translateZ(${-radius}px)`
    })
  }

  function norm(a) {
    a %= 360
    if (a > 180)  a -= 360
    if (a < -180) a += 360
    return a
  }

  function applyRotation() {
    ring.style.transform = `translate(-50%, -50%) rotateY(${rotation}deg)`
  }

  /* Per-frame: fade / disable the cards that have wrapped around behind us. */
  function updateCards() {
    cards.forEach((card, i) => {
      const facing = norm(i * step + rotation)
      const af     = Math.abs(facing)
      if (af >= 90) {
        card.style.opacity = '0'
        card.style.pointerEvents = 'none'
        card.style.zIndex = '0'
        card.classList.remove('is-active')
        return
      }
      const t = Math.cos(facing * Math.PI / 180)        // 1 front → 0 at the sides
      card.style.opacity = (af < 58 ? 1 : (90 - af) / 32).toFixed(3)
      card.style.pointerEvents = af < 60 ? 'auto' : 'none'
      card.style.zIndex = String(Math.round(100 + (1 - t) * 100))  // near (side) cards on top
      card.classList.toggle('is-active', af < step / 2)
    })
  }

  function spinAllowed() {
    return inView && !hovering && !dragging && !autoPaused &&
           !reduced.matches && !(dialog && dialog.open)
  }

  function tick(now) {
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    if (target !== null) {
      rotation += (target - rotation) * Math.min(1, dt * 7)
      if (Math.abs(target - rotation) < 0.06) { rotation = target; target = null }
    } else if (spinAllowed()) {
      rotation += AUTO_SPEED * dt
    }
    if (rotation > 360)  rotation -= 360
    if (rotation < -360) rotation += 360
    applyRotation()
    updateCards()
    raf = requestAnimationFrame(tick)
  }

  function pauseThenResume() {
    autoPaused = true
    clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => { autoPaused = false }, RESUME_DELAY)
  }

  function nudge(dir) {
    const base = target ?? rotation
    target = base + dir * step
    pauseThenResume()
  }

  function openCard(card) {
    if (!dialog || !dImg) return
    const img = card.querySelector('img')
    dImg.src = img?.currentSrc || img?.src || ''
    dImg.alt = card.dataset.name || ''
    if (dName) dName.textContent = card.dataset.name || ''
    dialog.showModal()
  }

  /* ── Interactions ── */
  arrows.forEach(a => {
    a.addEventListener('click', () => nudge(Number(a.dataset.teamDirection) || 1))
  })

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (Math.abs(dragDelta) > DRAG_THRESH) return   // ignore the drag-end click
      openCard(card)
    })
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(card) }
    })
  })

  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true })
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !dragging) hovering = false })

  stage.addEventListener('pointerdown', e => {
    pointerDown = true
    pointerId   = e.pointerId
    startX      = e.clientX
    startRot    = rotation
    dragDelta   = 0
    dragging    = false
    target      = null
  })

  stage.addEventListener('pointermove', e => {
    if (!pointerDown || e.pointerId !== pointerId) return
    dragDelta = e.clientX - startX
    if (!dragging && Math.abs(dragDelta) > DRAG_THRESH) {
      dragging = true
      stage.classList.add('is-dragging')
      stage.setPointerCapture?.(pointerId)   // capture only once dragging starts
    }
    if (dragging) rotation = startRot + dragDelta * DEG_PER_PX
  })

  function endPointer(e) {
    if (!pointerDown || e.pointerId !== pointerId) return
    pointerDown = false
    if (dragging) {
      dragging = false
      stage.classList.remove('is-dragging')
      stage.releasePointerCapture?.(pointerId)
      target = Math.round(rotation / step) * step    // snap to nearest member
      pauseThenResume()
      setTimeout(() => { dragDelta = 0 }, 0)
    } else if (e.pointerType === 'mouse') {
      hovering = stage.matches(':hover')
    }
    pointerId = null
  }
  stage.addEventListener('pointerup', endPointer)
  stage.addEventListener('pointercancel', endPointer)

  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1) }
  })

  dialog?.querySelector('.team-dialog__close')?.addEventListener('click', () => dialog.close())
  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close() })

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting },
    { threshold: 0.05 }).observe(section)

  layout()
  applyRotation()
  updateCards()
  raf = requestAnimationFrame(tick)
  window.addEventListener('resize', () => { layout(); updateCards() }, { passive: true })

  gsap.fromTo('.team__header',
    { opacity: 0, y: 36 },
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: section, start: 'top 72%' } })

  gsap.fromTo(stage,
    { opacity: 0 },
    { opacity: 1, duration: 1, ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 64%' } })

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf)
    clearTimeout(resumeTimer)
  }, { once: true })
}
