/* $SAIYAN Hall of Power — the gallery itself, mounted into a container.

   One implementation, two homes:
     - /gallery.html mounts it as the whole page (direct links, sharing).
     - the landing page mounts it as an in-place view over the hero.
   The second exists because a link to /gallery.html is a document load, which
   destroys the shared <audio> element and stops the soundtrack. Opening the
   Hall in place keeps that element alive, so the music never breaks.

   It reads the public feed (GET /api/ai/feed) — no login, no session, and the
   payload carries no account identity, so nothing here says who made what.
   Videos and memes are prompt-driven and public by default. PFPs are generated
   from a photo the user uploaded, so the backend keeps them private until their
   owner publishes one. This module only renders what the feed hands it; it
   never decides visibility itself. */

import './hall.css'
import { AI_CONFIG } from '../sections/ai/config.js'

const base = () => AI_CONFIG.apiBase.replace(/\/$/, '')

const RAILS = [
  { key: 'video', title: 'VIDEOS', tag: 'VIDEO', empty: 'No power unleashed yet. Be the first.' },
  { key: 'meme', title: 'MEMES', tag: 'MEME', empty: 'No memes yet. Be the first.' },
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

const el = (tag, className, text) => {
  const n = document.createElement(tag)
  if (className) n.className = className
  if (text != null) n.textContent = text
  return n
}

/**
 * @param {HTMLElement} root         container to fill; gains .gal-root
 * @param {object}      opts
 * @param {'page'|'view'} opts.mode  'view' closes in place instead of leaving
 * @param {() => void}  opts.onClose invoked by the × and by Escape in 'view'
 * @returns {{ destroy: () => void, focus: () => void }}
 */
export function mountHall(root, { mode = 'page', onClose } = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const listeners = []
  const on = (target, type, fn, opt) => {
    target.addEventListener(type, fn, opt)
    listeners.push(() => target.removeEventListener(type, fn, opt))
  }

  const state = Object.fromEntries(
    RAILS.map((r) => [
      r.key,
      {
        items: [],
        nextBefore: null,
        done: false,
        loading: false,
        failed: false,
        started: false,
      },
    ]),
  )

  /* ── Shell ──────────────────────────────────────────────────────────────── */

  root.classList.add('gal-root')
  if (mode === 'view') root.classList.add('gal-root--view')
  root.textContent = ''

  const shell = el('div', 'gal-shell')
  shell.appendChild(Object.assign(el('div', 'gal-shell__glow'), { ariaHidden: 'true' }))

  const header = el('header', 'gal-header')
  const brand = el('a', 'gal-brand')
  brand.href = '/'
  brand.setAttribute('aria-label', 'Return to $SAIYAN home')
  const logo = el('img')
  logo.src = '/images/logo.png'
  logo.alt = ''
  brand.append(logo, el('span', 'gal-brand__text', '$SAIYAN'))

  const actions = el('div', 'gal-actions')
  const cta = el('a', 'gal-cta', 'AWAKEN YOURS')
  cta.href = '/#creator'
  const back = el('button', 'gal-back', '×')
  back.type = 'button'
  back.setAttribute('aria-label', 'Back to the main page')
  back.title = 'Back'
  actions.append(cta, back)
  header.append(brand, actions)

  // In view mode both the × and the brand close in place rather than reloading
  // the document, which would take the soundtrack down with it.
  if (mode === 'view') {
    on(back, 'click', () => onClose?.())
    on(brand, 'click', (e) => {
      e.preventDefault()
      onClose?.()
    })
    on(cta, 'click', (e) => {
      e.preventDefault()
      onClose?.('#creator')
    })
  } else {
    on(back, 'click', () => {
      location.href = '/'
    })
  }

  const main = el('main', 'gal-main')
  main.append(
    el('p', 'gal-eyebrow', 'POWER UNLEASHED'),
    el('h1', 'gal-title', 'HALL OF POWER'),
    el('p', 'gal-sub', 'Every awakening the community has unleashed.'),
  )
  const railsRoot = el('div', 'gal-rails')
  main.appendChild(railsRoot)

  shell.append(header, main)
  root.appendChild(shell)

  /* ── Lightbox ───────────────────────────────────────────────────────────── */

  const lightbox = el('div', 'gal-light')
  lightbox.hidden = true
  const close = el('button', 'gal-light__close', '×')
  close.type = 'button'
  close.setAttribute('aria-label', 'Close')
  const stage = el('figure', 'gal-light__stage')
  const navPrev = el('button', 'gal-light__nav gal-light__nav--prev', '‹')
  navPrev.type = 'button'
  navPrev.setAttribute('aria-label', 'Previous')
  const navNext = el('button', 'gal-light__nav gal-light__nav--next', '›')
  navNext.type = 'button'
  navNext.setAttribute('aria-label', 'Next')
  lightbox.append(close, stage, navPrev, navNext)
  root.appendChild(lightbox)

  /* ── Feed ───────────────────────────────────────────────────────────────── */

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

  /* ── Rails ──────────────────────────────────────────────────────────────── */

  function buildRail(rail) {
    const section = el('section', 'gal-rail')
    section.id = rail.key
    section.dataset.rail = rail.key

    const head = el('div', 'gal-rail__head')
    head.appendChild(el('h2', 'gal-rail__title', rail.title))
    if (rail.note) head.appendChild(el('p', 'gal-rail__note', rail.note))
    section.appendChild(head)

    const viewport = el('div', 'gal-rail__viewport')
    const track = el('div', 'gal-rail__track')
    track.tabIndex = 0
    track.setAttribute('role', 'list')
    track.setAttribute('aria-label', rail.title)
    // Lenis hijacks wheel and touch globally on the landing page; without this
    // the rail would never receive them when the Hall is open over it.
    track.setAttribute('data-lenis-prevent', '')

    const mkArrow = (dir, glyph, label) => {
      const b = el('button', `gal-rail__arrow gal-rail__arrow--${dir}`, glyph)
      b.type = 'button'
      b.setAttribute('aria-label', `${label} ${rail.title.toLowerCase()}`)
      on(b, 'click', () => {
        track.scrollBy({
          left: (dir === 'next' ? 1 : -1) * track.clientWidth * 0.9,
          behavior: reduceMotion ? 'auto' : 'smooth',
        })
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
    on(track, 'scroll', sync, { passive: true })
    on(window, 'resize', sync)

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
    for (let i = 0; i < 6; i++) track.appendChild(el('div', `gal-card gal-skel gal-card--${key}`))
  }

  function message(html) {
    const p = el('p', 'gal-msg')
    p.innerHTML = html
    return p
  }

  function card(rail, item, index) {
    const node = el('button', `gal-card gal-card--${rail.key}`)
    node.type = 'button'
    node.setAttribute('role', 'listitem')
    node.dataset.index = String(index)
    node.setAttribute('aria-label', `Open ${rail.tag.toLowerCase()} in full size`)

    const src = `${base()}${item.assetUrl}`
    if (item.kind === 'video') {
      const v = el('video')
      v.src = src
      v.muted = true
      v.loop = true
      v.playsInline = true
      v.preload = 'metadata'
      if (!reduceMotion && !coarse) {
        // Preview on hover only. Autoplaying a wall of video would cost the
        // visitor real bandwidth and drown the page.
        on(node, 'mouseenter', () => v.play().catch(() => {}))
        on(node, 'mouseleave', () => {
          v.pause()
          v.currentTime = 0
        })
      }
      node.appendChild(v)
      node.appendChild(el('span', 'gal-card__play', '▶'))
    } else {
      const img = el('img')
      img.src = src
      img.loading = 'lazy'
      img.decoding = 'async'
      img.alt = `A $SAIYAN ${rail.tag.toLowerCase()}`
      node.appendChild(img)
    }

    const d = new Date(item.createdAt)
    node.appendChild(
      el('span', 'gal-card__tag', `${rail.tag} · ${d.getDate()}/${d.getMonth() + 1}`),
    )
    on(node, 'click', () => openLightbox(rail.key, index))
    return node
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
        msg.querySelector('[data-retry]')?.addEventListener('click', (e) => {
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
      const end = el('div', 'gal-card gal-card--end')
      end.innerHTML = '<span>END OF<br />THE HALL</span>'
      frag.appendChild(end)
    }
    track.appendChild(frag)
    s.sync()
  }

  /* ── Lightbox behaviour ─────────────────────────────────────────────────── */

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
      const v = el('video')
      v.src = src
      v.controls = true
      v.autoplay = true
      v.loop = true
      v.playsInline = true
      stage.appendChild(v)
    } else {
      const img = el('img')
      img.src = src
      img.alt = `A $SAIYAN ${rail.tag.toLowerCase()}`
      stage.appendChild(img)
    }

    // meta is prompt-derived (character, spoken line or caption) — the same text
    // already visible in the asset itself, so nothing new is exposed here.
    const line = item.meta?.line || item.meta?.caption
    if (line || item.meta?.character) {
      const cap = el(
        'figcaption',
        'gal-light__cap',
        [item.meta?.character?.toUpperCase(), line].filter(Boolean).join(' — '),
      )
      stage.appendChild(cap)
    }

    navPrev.disabled = index === 0
    navNext.disabled = index === state[key].items.length - 1
    lightbox.hidden = false
    root.classList.add('is-lightboxed')
    close.focus()
  }

  function closeLightbox() {
    lightbox.hidden = true
    stage.textContent = '' // stops any playing video
    root.classList.remove('is-lightboxed')
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

  on(close, 'click', closeLightbox)
  on(navPrev, 'click', () => step(-1))
  on(navNext, 'click', () => step(1))
  on(lightbox, 'click', (e) => {
    if (e.target === lightbox) closeLightbox()
  })

  on(document, 'keydown', (e) => {
    if (lightbox.hidden) {
      if (e.key === 'Escape' && mode === 'view') onClose?.()
      return
    }
    if (e.key === 'Escape') closeLightbox()
    if (e.key === 'ArrowLeft') step(-1)
    if (e.key === 'ArrowRight') step(1)
  })

  // Swipe the lightbox on touch, the way a phone gallery is expected to behave.
  let touchX = null
  on(
    lightbox,
    'touchstart',
    (e) => {
      touchX = e.changedTouches[0].clientX
    },
    { passive: true },
  )
  on(
    lightbox,
    'touchend',
    (e) => {
      if (touchX === null) return
      const dx = e.changedTouches[0].clientX - touchX
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
      touchX = null
    },
    { passive: true },
  )

  /* ── Boot ───────────────────────────────────────────────────────────────── */

  for (const rail of RAILS) railsRoot.appendChild(buildRail(rail))

  // Each rail fetches only once it is worth showing, so opening the Hall does
  // not pull three categories at once.
  let io = null
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue
          const key = en.target.dataset.rail
          if (!state[key].started) loadPage(key)
          io.unobserve(en.target)
        }
      },
      { root: mode === 'view' ? root : null, rootMargin: '300px' },
    )
    for (const rail of RAILS) io.observe(state[rail.key].el)
  } else {
    for (const rail of RAILS) loadPage(rail.key)
  }

  return {
    focus() {
      back.focus()
    },
    destroy() {
      io?.disconnect()
      for (const off of listeners) off()
      root.textContent = ''
      root.classList.remove('gal-root', 'gal-root--view', 'is-lightboxed')
    },
  }
}

export { RAILS }
