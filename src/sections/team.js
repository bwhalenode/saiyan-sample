import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const AUTO_SPEED   = 7      // degrees / second (slow spin)
const DEG_PER_PX   = 0.26   // drag sensitivity
const RESUME_DELAY = 3000   // ms idle before auto-spin resumes after interaction
const DRAG_THRESH  = 6      // px before a press becomes a drag
const RADIUS_K     = 1.86   // wider ring keeps the full near and far arcs readable
const TILT         = 15     // reveal the branded far-side backs without crowding the heading

export function initTeam() {
  const section = document.getElementById('team')
  const stage   = section?.querySelector('.team__stage')
  const ring    = document.getElementById('team-ring')
  const cards   = Array.from(ring?.querySelectorAll('.team-card') || [])
  const dialog  = document.getElementById('team-dialog')

  if (!section || !stage || !ring || !cards.length) return

  const N       = cards.length
  const step    = 360 / N
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  const dImg  = dialog?.querySelector('.team-dialog__image')
  const dName = dialog?.querySelector('.team-dialog__name')

  // Give each card a branded back face so it reads as a real card turning
  // around the ring (front = member art, back = $SAIYAN mark).
  cards.forEach(card => {
    if (!card.querySelector('.team-card__back')) {
      const back = document.createElement('div')
      back.className = 'team-card__back'
      back.setAttribute('aria-hidden', 'true')
      back.innerHTML = '<img src="/images/logo.png" alt="" /><span>$SAIYAN</span>'
      card.appendChild(back)
    }
  })

  let radius      = 480
  let rotation    = 0
  let target      = null   // when set, ease toward it (keyboard / tap-to-front / drag-snap)
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

  function layout() {
    const w = cards[0].getBoundingClientRect().width || 240
    radius = Math.round(w * RADIUS_K)
    cards.forEach((card, i) => {
      card.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`
    })
  }

  function norm(a) {
    a %= 360
    if (a > 180)  a -= 360
    if (a < -180) a += 360
    return a
  }

  function applyRotation() {
    ring.style.transform = `translate(-50%, -50%) rotateX(${TILT}deg) rotateY(${rotation}deg)`
  }

  /* Every card stays rendered (so you see the whole circle, fronts on the near
     side and backs wrapping around the far side). Depth = z-index + a gentle dim. */
  function updateCards() {
    cards.forEach((card, i) => {
      const facing = norm(i * step + rotation)
      const c = Math.cos(facing * Math.PI / 180)      // 1 = front, -1 = back
      card.style.zIndex  = String(Math.round(200 + c * 100))
      card.style.opacity = (0.46 + 0.54 * ((c + 1) / 2)).toFixed(3)
      card.style.filter  = `brightness(${(0.74 + 0.26 * ((c + 1) / 2)).toFixed(3)})`
      card.classList.toggle('is-far', c < -0.08)
      card.classList.toggle('is-active', Math.abs(facing) < step / 2)
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
      if (Math.abs(target - rotation) < 0.05) { rotation = target; target = null }
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

  // Rotate so card i faces front (shortest path).
  function bringToFront(i) {
    target = rotation - norm(i * step + rotation)
    pauseThenResume()
  }

  function openCard(card) {
    if (!dialog || !dImg) return
    const img = card.querySelector('.team-card__image-wrap img')
    dImg.src = img?.currentSrc || img?.src || ''
    dImg.alt = card.dataset.name || ''
    if (dName) dName.textContent = card.dataset.name || ''
    dialog.showModal()
  }

  /* ── Interactions ── */
  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (Math.abs(dragDelta) > DRAG_THRESH) return     // ignore the drag-end click
      if (Math.abs(norm(i * step + rotation)) < step / 2) openCard(card)  // front card → open
      else bringToFront(i)                                                // others → spin to front
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
      stage.setPointerCapture?.(pointerId)
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

  gsap.fromTo(['.team__header', '.team__hint'],
    { opacity: 0, y: 36 },
    { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 72%',
        end: 'bottom 18%',
        toggleActions: 'play reverse play reverse',
      } })

  gsap.fromTo(stage,
    { opacity: 0 },
    { opacity: 1, duration: 1, ease: 'power2.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 64%',
        end: 'bottom 18%',
        toggleActions: 'play reverse play reverse',
      } })

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf)
    clearTimeout(resumeTimer)
  }, { once: true })
}
