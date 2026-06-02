import gsap           from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const AUTO_INTERVAL = 3400  // ms between auto-advances
const RESUME_DELAY  = 3000  // ms idle before auto-advance resumes after interaction
const DRAG_THRESH   = 6     // px before a press becomes a drag
const VISIBLE       = 2.2   // how many cards each side stay rendered

export function initTeam() {
  const section = document.getElementById('team')
  const stage   = section?.querySelector('.team__stage')
  const ring    = document.getElementById('team-ring')
  const cards   = Array.from(ring?.querySelectorAll('.team-card') || [])
  const arrows  = Array.from(section?.querySelectorAll('.team__arrow') || [])
  const dialog  = document.getElementById('team-dialog')

  if (!section || !stage || !ring || !cards.length) return

  const N       = cards.length
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  const dImg  = dialog?.querySelector('.team-dialog__image')
  const dName = dialog?.querySelector('.team-dialog__name')

  let spacing     = 300   // px between adjacent card centres (set in measure())
  let pos         = 0     // current (eased) carousel position, in card units
  let target      = 0     // snap target, in card units
  let autoTimer   = null
  let resumeAt    = 0
  let inView      = false
  let hovering    = false
  let pointerDown = false
  let dragging    = false
  let pointerId   = null
  let startX      = 0
  let startPos    = 0
  let dragDelta   = 0
  let raf         = null
  let prev        = performance.now()

  /* Spacing is a touch WIDER than a card so the focal card and its neighbours
     never overlap — neighbours just peek in from the sides (and sit off-screen
     on narrow phones, leaving a single clean card). */
  function measure() {
    const w = cards[0].getBoundingClientRect().width || 240
    spacing = w * 1.04
  }

  // Shortest signed distance from the focal position, wrapping around the ring.
  function wrapDelta(d) {
    d = ((d % N) + N) % N
    if (d > N / 2) d -= N
    return d
  }

  function render() {
    cards.forEach((card, i) => {
      const d  = wrapDelta(i - pos)
      const ad = Math.abs(d)
      if (ad > VISIBLE) {
        card.style.opacity = '0'
        card.style.pointerEvents = 'none'
        card.style.zIndex = '0'
        card.classList.remove('is-active')
        return
      }
      const x     = d * spacing
      const scale = Math.max(0.7, 1 - ad * 0.16)
      const op    = Math.max(0, 1 - ad * 0.5)
      card.style.transform = `translate(-50%, -50%) translateX(${x.toFixed(1)}px) scale(${scale.toFixed(3)})`
      card.style.opacity = op.toFixed(3)
      card.style.pointerEvents = 'auto'
      card.style.zIndex = String(Math.round(100 - ad * 10))
      card.classList.toggle('is-active', ad < 0.5)
    })
  }

  function tick(now) {
    const dt = Math.min((now - prev) / 1000, 0.05)
    prev = now
    if (!dragging) {
      pos += (target - pos) * Math.min(1, dt * 6)
      if (Math.abs(target - pos) < 0.0005) pos = target
    }
    render()
    raf = requestAnimationFrame(tick)
  }

  function canAuto() {
    return inView && !hovering && !dragging && !reduced.matches &&
           !(dialog && dialog.open) && Date.now() > resumeAt
  }

  function scheduleAuto() {
    clearInterval(autoTimer)
    autoTimer = setInterval(() => { if (canAuto()) target += 1 }, AUTO_INTERVAL)
  }

  function pause() { resumeAt = Date.now() + RESUME_DELAY }

  // Bring card i to the front by the shortest path; returns the unbounded target.
  function targetForCard(i) {
    const base = Math.round(target)
    return base + wrapDelta(i - base)
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
    a.addEventListener('click', () => { target = Math.round(target) + (Number(a.dataset.teamDirection) || 1); pause() })
  })

  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      if (Math.abs(dragDelta) > DRAG_THRESH) return        // ignore the drag-end click
      if (Math.abs(wrapDelta(i - pos)) < 0.5) openCard(card) // focal card → open
      else { target = targetForCard(i); pause() }            // side card → bring to front
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
    startPos    = pos
    dragDelta   = 0
    dragging    = false
  })

  stage.addEventListener('pointermove', e => {
    if (!pointerDown || e.pointerId !== pointerId) return
    dragDelta = e.clientX - startX
    if (!dragging && Math.abs(dragDelta) > DRAG_THRESH) {
      dragging = true
      stage.classList.add('is-dragging')
      stage.setPointerCapture?.(pointerId)
    }
    if (dragging) pos = startPos - dragDelta / spacing
  })

  function endPointer(e) {
    if (!pointerDown || e.pointerId !== pointerId) return
    pointerDown = false
    if (dragging) {
      dragging = false
      stage.classList.remove('is-dragging')
      stage.releasePointerCapture?.(pointerId)
      target = Math.round(pos)
      pause()
      setTimeout(() => { dragDelta = 0 }, 0)
    } else if (e.pointerType === 'mouse') {
      hovering = stage.matches(':hover')
    }
    pointerId = null
  }
  stage.addEventListener('pointerup', endPointer)
  stage.addEventListener('pointercancel', endPointer)

  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); target = Math.round(target) - 1; pause() }
    if (e.key === 'ArrowRight') { e.preventDefault(); target = Math.round(target) + 1; pause() }
  })

  dialog?.querySelector('.team-dialog__close')?.addEventListener('click', () => dialog.close())
  dialog?.addEventListener('click', e => { if (e.target === dialog) dialog.close() })

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting },
    { threshold: 0.05 }).observe(section)

  measure()
  render()
  raf = requestAnimationFrame(tick)
  scheduleAuto()
  window.addEventListener('resize', () => { measure(); render() }, { passive: true })

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
    clearInterval(autoTimer)
  }, { once: true })
}
