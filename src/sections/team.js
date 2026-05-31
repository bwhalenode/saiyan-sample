import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const AUTO_SPEED   = 7     // degrees per second (slow spin)
const DEG_PER_PX   = 0.26  // drag sensitivity
const RESUME_DELAY = 3000  // ms of idle before auto-spin resumes after interaction

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
  const dRole = dialog?.querySelector('.team-dialog__role')
  const dBio  = dialog?.querySelector('.team-dialog__bio')

  let radius      = 440
  let rotation    = 0
  let target      = null    // when set, ease toward it (arrow / drag-snap)
  let autoPaused  = false
  let resumeTimer = null
  let inView      = false
  let hovering    = false
  let dragging    = false
  let pointerId   = null
  let startX      = 0
  let startRot    = 0
  let dragDelta   = 0
  let raf         = null
  let prev        = performance.now()

  /* Place cards evenly around the ring; radius derived from card width so they
     don't overlap regardless of viewport size. */
  function layout() {
    const w = cards[0].getBoundingClientRect().width || 240
    radius = Math.round((w * 1.22) / (2 * Math.tan(Math.PI / N)))
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

  function apply() {
    ring.style.transform = `translate(-50%, -50%) rotateY(${rotation}deg)`
  }

  /* Per-frame: dim/hide cards by how far they face away; mark the front one. */
  function updateCards() {
    cards.forEach((card, i) => {
      const facing = norm(i * step + rotation)
      const af     = Math.abs(facing)
      const front  = af <= 90
      const t      = front ? Math.cos(facing * Math.PI / 180) : 0
      card.style.opacity      = front ? (0.22 + 0.78 * t).toFixed(3) : '0'
      card.style.pointerEvents = af < 68 ? 'auto' : 'none'
      card.style.zIndex        = String(Math.round(200 - af))
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

    apply()
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
    if (dRole) { dRole.textContent = card.dataset.role || ''; dRole.hidden = !card.dataset.role }
    if (dBio)  dBio.textContent  = card.dataset.bio || ''
    dialog.showModal()
  }

  /* ── Interactions ── */
  arrows.forEach(a => {
    a.addEventListener('click', () => nudge(Number(a.dataset.teamDirection) || 1))
  })

  cards.forEach(card => {
    card.addEventListener('click', () => {
      if (Math.abs(dragDelta) > 8) return   // ignore the click that ends a drag
      openCard(card)
    })
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCard(card) }
    })
  })

  stage.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hovering = true })
  stage.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !dragging) hovering = false })

  stage.addEventListener('pointerdown', e => {
    pointerId = e.pointerId
    dragging  = true
    startX    = e.clientX
    startRot  = rotation
    dragDelta = 0
    target    = null
    stage.classList.add('is-dragging')
    stage.setPointerCapture?.(pointerId)
  })

  stage.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== pointerId) return
    dragDelta = e.clientX - startX
    rotation  = startRot + dragDelta * DEG_PER_PX
  })

  function endDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return
    dragging = false
    stage.classList.remove('is-dragging')
    stage.releasePointerCapture?.(pointerId)
    pointerId = null
    if (e.pointerType === 'mouse') hovering = stage.matches(':hover')
    target = Math.round(rotation / step) * step   // snap to nearest member
    pauseThenResume()
    setTimeout(() => { dragDelta = 0 }, 0)
  }
  stage.addEventListener('pointerup', endDrag)
  stage.addEventListener('pointercancel', endDrag)

  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(1) }
  })

  dialog?.querySelector('.team-dialog__close')?.addEventListener('click', () => dialog.close())
  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close() })

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting },
    { threshold: 0.05 }).observe(section)

  layout()
  apply()
  updateCards()
  raf = requestAnimationFrame(tick)
  window.addEventListener('resize', layout, { passive: true })

  /* Entrance reveals (opacity only on the stage so the 3D perspective is intact) */
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
