/* $SAIYAN community gallery.
   Reads the public feed (GET /api/ai/feed) — no login, no session, and the
   payload carries no account identity, so nothing here says who made what.

   Videos and memes are prompt-driven and public by default. PFPs are generated
   from a photo the user uploaded, so the backend keeps them private until their
   owner publishes one from their private gallery. This page only ever renders
   what the feed hands it; it never decides visibility itself. */

import { AI_CONFIG } from './sections/ai/config.js'

const base = () => AI_CONFIG.apiBase.replace(/\/$/, '')

const TABS = {
  video: { label: 'VIDEOS', tag: 'VIDEO', empty: 'No power unleashed yet. Be the first.' },
  meme: { label: 'MEMES', tag: 'MEME', empty: 'No memes yet. Be the first.' },
  pfp: { label: 'PFPS', tag: 'PFP', empty: 'No warrior has shown their face yet.' },
}
const PAGE = 24

const $ = (sel) => document.querySelector(sel)
const grid = $('[data-grid]')
const note = $('[data-note]')
const moreBtn = $('[data-more]')
const endMsg = $('[data-end]')
const sentinel = $('[data-sentinel]')
const lightbox = $('[data-lightbox]')
const stage = $('[data-stage]')

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// One bucket per tab so switching back is instant and keeps its scroll position.
const buckets = Object.fromEntries(
  Object.keys(TABS).map((k) => [k, { items: [], nextBefore: null, done: false, loading: false, failed: false }]),
)
let active = 'video'

/* ── Feed ─────────────────────────────────────────────────────────────────── */

async function loadPage(tab) {
  const bucket = buckets[tab]
  if (bucket.loading || bucket.done) return
  bucket.loading = true
  bucket.failed = false
  if (!bucket.items.length) renderSkeletons()
  setFooter()

  try {
    if (!base()) throw new Error('no_api_base')
    const url = new URL(`${base()}/api/ai/feed`)
    url.searchParams.set('tab', tab)
    url.searchParams.set('limit', String(PAGE))
    if (bucket.nextBefore) url.searchParams.set('before', String(bucket.nextBefore))

    const res = await fetch(url, { credentials: 'omit' })
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error(data.error || `http_${res.status}`)

    bucket.items.push(...data.items)
    bucket.nextBefore = data.nextBefore
    bucket.done = !data.nextBefore
  } catch {
    bucket.failed = true
  } finally {
    bucket.loading = false
    if (tab === active) render()
  }
}

/* ── Rendering ────────────────────────────────────────────────────────────── */

function renderSkeletons() {
  grid.textContent = ''
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('div')
    s.className = 'gal-skel'
    grid.appendChild(s)
  }
}

function message(html) {
  const p = document.createElement('p')
  p.className = 'gal-msg'
  p.innerHTML = html
  return p
}

function tile(item, index) {
  const el = document.createElement('button')
  el.className = 'gal-item'
  el.type = 'button'
  el.dataset.index = String(index)
  el.setAttribute('aria-label', `Open ${TABS[active].tag.toLowerCase()} in full size`)

  const src = `${base()}${item.assetUrl}`
  if (item.kind === 'video') {
    const v = document.createElement('video')
    v.src = src
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'metadata'
    if (!reduceMotion) {
      // Preview on hover only. Autoplaying a wall of video would cost the
      // visitor real bandwidth and drown the page.
      el.addEventListener('mouseenter', () => v.play().catch(() => {}))
      el.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0 })
    }
    el.appendChild(v)
    const play = document.createElement('span')
    play.className = 'gal-item__play'
    play.textContent = '▶'
    el.appendChild(play)
  } else {
    const img = document.createElement('img')
    img.src = src
    img.loading = 'lazy'
    img.decoding = 'async'
    img.alt = `A $SAIYAN ${TABS[active].tag.toLowerCase()}`
    el.appendChild(img)
  }

  const tag = document.createElement('span')
  tag.className = 'gal-item__tag'
  const d = new Date(item.createdAt)
  tag.textContent = `${TABS[active].tag} · ${d.getDate()}/${d.getMonth() + 1}`
  el.appendChild(tag)

  el.addEventListener('click', () => openLightbox(index))
  return el
}

function render() {
  const bucket = buckets[active]
  grid.textContent = ''
  note.hidden = active !== 'pfp'

  if (!bucket.items.length) {
    if (bucket.loading) return renderSkeletons()
    if (bucket.failed) {
      grid.appendChild(message(
        !base()
          ? 'The hall is sealed right now. Try again shortly.'
          : 'The hall would not open. <a href="#" data-retry>Try again</a>.',
      ))
      grid.querySelector('[data-retry]')?.addEventListener('click', (e) => {
        e.preventDefault()
        loadPage(active)
      })
    } else {
      grid.appendChild(message(`${TABS[active].empty}<br /><a href="/#creator">Awaken yours →</a>`))
    }
    setFooter()
    return
  }

  const frag = document.createDocumentFragment()
  bucket.items.forEach((item, i) => frag.appendChild(tile(item, i)))
  grid.appendChild(frag)
  setFooter()
}

function setFooter() {
  const bucket = buckets[active]
  const hasItems = bucket.items.length > 0
  moreBtn.hidden = !hasItems || bucket.done || bucket.loading
  moreBtn.textContent = 'UNLEASH MORE'
  endMsg.hidden = !hasItems || !bucket.done
}

/* ── Lightbox ─────────────────────────────────────────────────────────────── */

let lightIndex = -1

function openLightbox(index) {
  lightIndex = index
  const item = buckets[active].items[index]
  if (!item) return

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
    img.alt = `A $SAIYAN ${TABS[active].tag.toLowerCase()}`
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

  lightbox.hidden = false
  document.body.style.overflow = 'hidden'
  $('[data-close]').focus()
}

function closeLightbox() {
  lightbox.hidden = true
  stage.textContent = '' // stops any playing video
  document.body.style.overflow = ''
  grid.querySelector(`[data-index="${lightIndex}"]`)?.focus()
  lightIndex = -1
}

function step(delta) {
  const items = buckets[active].items
  const next = lightIndex + delta
  if (next < 0 || next >= items.length) return
  openLightbox(next)
}

/* ── Tabs ─────────────────────────────────────────────────────────────────── */

function selectTab(tab, { push = true } = {}) {
  if (!TABS[tab]) tab = 'video'
  active = tab
  for (const btn of document.querySelectorAll('.gal-tab')) {
    btn.setAttribute('aria-selected', String(btn.dataset.tab === tab))
  }
  // Shareable per-tab links, without adding a router to a static page.
  if (push && location.hash.slice(1) !== tab) history.replaceState(null, '', `#${tab}`)
  render()
  if (!buckets[tab].items.length) loadPage(tab)
}

/* ── Wiring ───────────────────────────────────────────────────────────────── */

for (const btn of document.querySelectorAll('.gal-tab')) {
  btn.addEventListener('click', () => selectTab(btn.dataset.tab))
}
moreBtn.addEventListener('click', () => loadPage(active))
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

window.addEventListener('hashchange', () => selectTab(location.hash.slice(1), { push: false }))

// Infinite scroll, with the button kept as the accessible fallback.
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) loadPage(active)
  }, { rootMargin: '600px' }).observe(sentinel)
}

selectTab(location.hash.slice(1) || 'video', { push: false })
