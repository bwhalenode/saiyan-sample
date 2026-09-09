/* $SAIYAN Hall of Power.
   Reads the public feed (GET /api/ai/feed) — no login, no session, and the
   payload carries no account identity, so nothing here says who made what.

   Videos and memes are prompt-driven and public by default. PFPs are generated
   from a photo the user uploaded, so the backend keeps them private until their
   owner publishes one from their private gallery. This page only ever renders
   what the feed hands it; it never decides visibility itself.

   Layout is one horizontal rail per category. Each rail paginates as you reach
   its end, so a visitor never loads three categories' worth of video to look
   at one. */

import { AI_CONFIG } from './sections/ai/config.js'

const base = () => AI_CONFIG.apiBase.replace(/\/$/, '')

const RAILS = [
  {
    key: 'video',
    title: 'VIDEOS',
    tag: 'VIDEO',
    empty: 'No power unleashed yet. Be the first.',
  },
  {
    key: 'meme',
    title: 'MEMES',
    tag: 'MEME',
    empty: 'No memes yet. Be the first.',
  },
  {
    key: 'pfp',
    title: 'PFPS',
    tag: 'PFP',
    empty: 'No warrior has shown their face yet.',
    // Plain-spoken on purpose: this is a privacy promise, not copy.
    note: 'A PFP is made from a photo you upload, so it stays private unless you choose to show it. These warriors chose to.',
  },
]
const PAGE = 18

const $ = (sel, root = document) => root.querySelector(sel)
const lightbox = $('[data-lightbox]')
const stage = $('[data-stage]')
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const coarse = window.matchMedia('(pointer: coarse)').matches

const state = Object.fromEntries(
  RAILS.map((r) => [r.key, { items: [], nextBefore: null, done: false, loading: false, failed: false, started: false, el: null, track: null }]),
)

/* ── Feed ─────────────────────────────────────────────────────────────────── */

async function loadPage(key) {
  const s = state[key]
  if (s.loading || s.done) return
  s.loading = true
  s.failed = false
  s.started = true
  if (!s.items.length) renderSkeletons(key)

  try {
    if (!base()) throw new Error('no_api_base')
    const url = new URL(`${base()}/api/ai/feed`)
    url.searchParams.set('tab', key)
    url.searchParams.set('limit', String(PAGE))
    if (s.nextBefore) url.searchParams.set('before', String(s.nextBefore))

    const res = await fetch(url, { credentials: 'omit' })
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error(data.error || `http_${res.status}`)

    s.items.push(...data.items)
    s.nextBefore = data.nextBefore
    s.done = !data.nextBefore
  } catch {
    s.failed = true
  } finally {
    s.loading = false
    renderRail(key)
  }
}

/* ── Rails ────────────────────────────────────────────────────────────────── */

function buildRail(rail) {
  const section = document.createElement('section')
  section.className = 'gal-rail'
  section.id = rail.key
  section.dataset.rail = rail.key

  const head = document.createElement('div')
  head.className = 'gal-rail__head'
  const h2 = document.createElement('h2')
  h2.className = 'gal-rail__title'
  h2.textContent = rail.title
  head.appendChild(h2)
  if (rail.note) {
    const note = document.createElement('p')
    note.className = 'gal-rail__note'
    note.textContent = rail.note
    head.appendChild(note)
  }
  section.appendChild(head)

  const viewport = document.createElement('div')
  viewport.className = 'gal-rail__viewport'

  const track = document.createElement('div')
  track.className = 'gal-rail__track'
  track.tabIndex = 0
  track.setAttribute('role', 'list')
  track.setAttribute('aria-label', rail.title)

  // Arrows are pointer affordances; touch devices swipe the track instead.
  const mkArrow = (dir, glyph, label) => {
    const b = document.createElement('button')
    b.className = `gal-rail__arrow gal-rail__arrow--${dir}`
    b.type = 'button'
    b.textContent = glyph
    b.setAttribute('aria-label', `${label} ${rail.title.toLowerCase()}`)
    b.addEventListener('click', () => {
      track.scrollBy({ left: (dir === 'next' ? 1 : -1) * track.clientWidth * 0.9, behavior: reduceMotion ? 'auto' : 'smooth' })
    })
    return b
  }
  const prev = mkArrow('prev', '‹', 'Scroll back through')
  const next = mkArrow('next', '›', 'Scroll forward through')

  // Fade the arrows out at each end, and pull the next page in before the
  // visitor actually hits the edge.
  const sync = () => {
    const max = track.scrollWidth - track.clientWidth
    prev.disabled = track.scrollLeft < 8
    next.disabled = track.scrollLeft > max - 8
    section.classList.toggle('has-overflow', max > 8)
    if (max - track.scrollLeft < track.clientWidth) loadPage(rail.key)
  }
  track.addEventListener('scroll', sync, { passive: true })
  window.addEventListener('resize', sync)

  viewport.append(prev, track, next)
  section.appendChild(viewport)

  state[rail.key].el = section
  state[rail.key].track = track
  state[rail.key].sync = sync
  return section
}

function renderSkeletons(key) {
  const { track } = state[key]
  track.textContent = ''
  for (let i = 0; i < 6; i++) {
    const s = document.createElement('div')
    s.className = `gal-card gal-skel gal-card--${key}`
    track.appendChild(s)
  }
}

function message(html) {
  const p = document.createElement('p')
  p.className = 'gal-msg'
  p.innerHTML = html
  return p
}

function card(rail, item, index) {
  const el = document.createElement('button')
  el.className = `gal-card gal-card--${rail.key}`
  el.type = 'button'
  el.setAttribute('role', 'listitem')
  el.dataset.index = String(index)
  el.setAttribute('aria-label', `Open ${rail.tag.toLowerCase()} in full size`)

  const src = `${base()}${item.assetUrl}`
  if (item.kind === 'video') {
    const v = document.createElement('video')
    v.src = src
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'metadata'
    if (!reduceMotion && !coarse) {
      // Preview on hover only. Autoplaying a wall of video would cost the
      // visitor real bandwidth and drown the page.
      el.addEventListener('mouseenter', () => v.play().catch(() => {}))
      el.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0 })
    }
    el.appendChild(v)
    const play = document.createElement('span')
    play.className = 'gal-card__play'
    play.textContent = '▶'
    el.appendChild(play)
  } else {
    const img = document.createElement('img')
    img.src = src
    img.loading = 'lazy'
    img.decoding = 'async'
    img.alt = `A $SAIYAN ${rail.tag.toLowerCase()}`
    el.appendChild(img)
  }

  const tag = document.createElement('span')
  tag.className = 'gal-card__tag'
  const d = new Date(item.createdAt)
  tag.textContent = `${rail.tag} · ${d.getDate()}/${d.getMonth() + 1}`
  el.appendChild(tag)

  el.addEventListener('click', () => openLightbox(rail.key, index))
  return el
}

function renderRail(key) {
  const rail = RAILS.find((r) => r.key === key)
  const s = state[key]
  const { track } = s
  track.textContent = ''

  if (!s.items.length) {
    if (s.loading) return renderSkeletons(key)
    if (s.failed) {
      const msg = message(
        !base()
          ? 'The hall is sealed right now. Try again shortly.'
          : 'The hall would not open. <a href="#" data-retry>Try again</a>.',
      )
      track.appendChild(msg)
      $('[data-retry]', msg)?.addEventListener('click', (e) => {
        e.preventDefault()
        loadPage(key)
      })
    } else {
      track.appendChild(message(`${rail.empty}<br /><a href="/#creator">Awaken yours →</a>`))
    }
    s.el.classList.remove('has-overflow')
    return
  }

  const frag = document.createDocumentFragment()
  s.items.forEach((item, i) => frag.appendChild(card(rail, item, i)))
  if (s.done) {
    const end = document.createElement('div')
    end.className = 'gal-card gal-card--end'
    end.innerHTML = '<span>END OF<br />THE HALL</span>'
    frag.appendChild(end)
  }
  track.appendChild(frag)
  s.sync()
}

/* ── Lightbox ─────────────────────────────────────────────────────────────── */

let openKey = null
let lightIndex = -1

function openLightbox(key, index) {
  const rail = RAILS.find((r) => r.key === key)
  const item = state[key].items[index]
  if (!item) return
  openKey = key
  lightIndex = index

  stage.textContent = ''
  const src = `${base()}${item.assetUrl}`
  if (item.kind === 'video') {
    const v = document.createElement('video')
    v.src = src
    v.controls = true
    v.autoplay = true
    v.loop = true
    v.playsInline = true
    stage.appendChild(v)
  } else {
    const img = document.createElement('img')
    img.src = src
    img.alt = `A $SAIYAN ${rail.tag.toLowerCase()}`
    stage.appendChild(img)
  }

  // meta is prompt-derived (character, spoken line or caption) — the same text
  // already visible in the asset itself, so nothing new is exposed here.
  const line = item.meta?.line || item.meta?.caption
  if (line || item.meta?.character) {
    const cap = document.createElement('figcaption')
    cap.className = 'gal-light__cap'
    cap.textContent = [item.meta?.character?.toUpperCase(), line].filter(Boolean).join(' — ')
    stage.appendChild(cap)
  }

  const items = state[key].items
  $('[data-prev]').disabled = index === 0
  $('[data-next]').disabled = index === items.length - 1

  lightbox.hidden = false
  document.body.style.overflow = 'hidden'
  $('[data-close]').focus()
}

function closeLightbox() {
  lightbox.hidden = true
  stage.textContent = '' // stops any playing video
  document.body.style.overflow = ''
  if (openKey) state[openKey].track.querySelector(`[data-index="${lightIndex}"]`)?.focus()
  openKey = null
  lightIndex = -1
}

function step(delta) {
  if (!openKey) return
  const next = lightIndex + delta
  if (next < 0 || next >= state[openKey].items.length) return
  openLightbox(openKey, next)
}

/* ── Wiring ───────────────────────────────────────────────────────────────── */

const railsRoot = $('[data-rails]')
for (const rail of RAILS) railsRoot.appendChild(buildRail(rail))

// Each rail fetches only once it is worth showing, so landing on the page does
// not pull three categories at once.
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue
      const key = en.target.dataset.rail
      if (!state[key].started) loadPage(key)
      io.unobserve(en.target)
    }
  }, { rootMargin: '300px' })
  for (const rail of RAILS) io.observe(state[rail.key].el)
} else {
  for (const rail of RAILS) loadPage(rail.key)
}

$('[data-close]').addEventListener('click', closeLightbox)
$('[data-prev]').addEventListener('click', () => step(-1))
$('[data-next]').addEventListener('click', () => step(1))
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox() })

document.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') step(-1)
  if (e.key === 'ArrowRight') step(1)
})

// Swipe the lightbox on touch, the way a phone gallery is expected to behave.
let touchX = null
lightbox.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX }, { passive: true })
lightbox.addEventListener('touchend', (e) => {
  if (touchX === null) return
  const dx = e.changedTouches[0].clientX - touchX
  if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
  touchX = null
}, { passive: true })

// #video / #meme / #pfp still lands you on the right rail.
const target = location.hash.slice(1)
if (state[target]) state[target].el.scrollIntoView({ block: 'start' })
