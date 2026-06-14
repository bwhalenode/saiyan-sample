/* SAIYAN AI — access gate (browser side).
   No phone number, no login widget. Flow:
     1) "Connect Telegram" opens t.me/<bot>?start=<nonce> in a new tab.
     2) The user taps Start in their Telegram app; the bot confirms to our backend.
     3) We poll the backend until linked, then check Saiyan group membership.
   Talks ONLY to our own backend (AI_CONFIG.auth.apiBase) — never sees the bot
   token. When the backend isn't configured the gate is a no-op so the demo keeps
   working; nothing here can crash the site. */

import './auth.css'
import { AI_CONFIG } from './config.js'

const cfg = AI_CONFIG.auth
const api = (path) => `${cfg.apiBase.replace(/\/$/, '')}${path}`

async function apiGet(path) {
  const res = await fetch(api(path), { credentials: 'include' })
  return res.json()
}
async function apiPost(path, body) {
  const res = await fetch(api(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  })
  return res.json()
}

// Show the connected username on load if a session already exists.
if (cfg.enabled) {
  apiGet('/api/session').then((s) => s && s.user && showChip(s.user)).catch(() => {})
}

let grant = null // resolve() of the in-flight ensureAccess promise
let pollTimer = null

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function finish(ok) {
  stopPoll()
  closeModal()
  const g = grant
  grant = null
  if (g) g(ok)
}

/* ── The gate the Generate button awaits ──
   Resolves true when access is granted (auto-resumes generation), false if the
   user backs out or it can't be verified. */
export function ensureAccess() {
  if (!cfg.enabled) {
    if (import.meta.env.DEV) {
      console.info('[saiyan-auth] gate disabled (set VITE_AUTH_API_BASE + VITE_TELEGRAM_BOT_USERNAME to enable).')
    }
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    grant = resolve
    begin()
  })
}

async function begin() {
  try {
    const session = await apiGet('/api/session')
    if (session && session.user) {
      showChip(session.user)
      const m = await apiGet('/api/membership')
      if (m && m.isMember) return finish(true)
      return openJoin(session.user, m && m.joinUrl, () => apiGet('/api/membership').then((r) => r && r.isMember))
    }
    openConnect()
  } catch {
    openNotice('Saiyan access service is unreachable right now. Please try again shortly.')
  }
}

/* ── Step 1: connect via the bot deep link ── */
function openConnect() {
  openModal((card) => {
    heading(
      card,
      'SAIYAN AI',
      'Connect Telegram',
      'Connect with the official Saiyan bot to unlock Saiyan AI. No phone number — it just opens your Telegram app.',
    )
    const btn = telegramButton('Connect Telegram', startConnect)
    card.appendChild(wrapRow(btn))
  })
}

async function startConnect() {
  const r = await apiPost('/api/link/start').catch(() => ({ ok: false }))
  if (!r || !r.ok || !r.deepLink) {
    return openNotice('Could not start the connection. Please try again shortly.')
  }
  window.open(r.deepLink, '_blank', 'noopener')
  showWaiting(r.nonce, r.joinUrl)
}

function showWaiting(nonce, joinUrl) {
  openModal((card) => {
    heading(
      card,
      'WAITING FOR TELEGRAM',
      'Tap “Start” in Telegram',
      'We opened the Saiyan bot in a new tab. Tap Start there — this updates automatically.',
    )
    card.appendChild(spinner())
    const retry = telegramButton('Reopen Telegram', () => window.open(`https://t.me/${cfg.botUsername}?start=${nonce}`, '_blank', 'noopener'))
    card.appendChild(wrapRow(retry))
  })

  const deadline = Date.now() + 1000 * 60 * 3
  stopPoll()
  pollTimer = setInterval(async () => {
    if (Date.now() > deadline) {
      stopPoll()
      return openConnectExpired()
    }
    const res = await apiGet(`/api/link/status?nonce=${encodeURIComponent(nonce)}`).catch(() => null)
    if (!res) return
    if (res.expired) {
      stopPoll()
      return openConnectExpired()
    }
    if (res.linked) {
      stopPoll()
      showChip(res.user)
      if (res.isMember) return finish(true)
      // Linked but not in the group yet — re-check via the nonce after they join.
      openJoin(res.user, res.joinUrl || joinUrl, () =>
        apiGet(`/api/link/recheck?nonce=${encodeURIComponent(nonce)}`).then((r) => r && r.isMember),
      )
    }
  }, 2500)
}

function openConnectExpired() {
  openModal((card) => {
    heading(card, 'SAIYAN AI', 'Connection timed out', 'No worries — start the connection again.')
    card.appendChild(wrapRow(telegramButton('Connect Telegram', startConnect)))
  })
}

/* ── Step 2: join the Saiyan group (opens Telegram, normal join), then verify ── */
function openJoin(user, joinUrl, recheck) {
  openModal((card) => {
    heading(
      card,
      'ONE STEP LEFT',
      'Join the Saiyan group',
      `Connected as ${userLabel(user)}. Join the Saiyan Telegram to unlock Saiyan AI — this updates once you're in.`,
    )
    const join = telegramButton('Join Saiyan Telegram', () => {
      if (joinUrl) window.open(joinUrl, '_blank', 'noopener')
    })
    const again = ghostButton('Check again', async () => {
      again.disabled = true
      again.textContent = 'Checking…'
      const ok = await recheck().catch(() => false)
      if (ok) return finish(true)
      again.disabled = false
      again.textContent = 'Check again'
      again.classList.add('saiyan-gate__btn--shake')
      setTimeout(() => again.classList.remove('saiyan-gate__btn--shake'), 500)
    })
    card.appendChild(wrapRow(join, again))
  })

  // Auto-verify in the background so they don't have to press anything.
  const deadline = Date.now() + 1000 * 60 * 4
  stopPoll()
  pollTimer = setInterval(async () => {
    if (Date.now() > deadline) return stopPoll()
    const ok = await recheck().catch(() => false)
    if (ok) finish(true)
  }, 3000)
}

function openNotice(message) {
  openModal((card) => {
    heading(card, 'SAIYAN AI', 'Hold on', message)
    card.appendChild(wrapRow(primaryButton('OK', () => finish(false))))
  })
}

/* ── Connected username chip in the panel bar ── */
function userLabel(user) {
  return user && user.username ? `@${user.username}` : (user && user.firstName) || 'your Telegram'
}

function showChip(user) {
  const bar = document.querySelector('.creator__forge-bar')
  if (!bar) return
  let chip = bar.querySelector('.creator__tg-chip')
  if (!chip) {
    chip = document.createElement('span')
    chip.className = 'creator__tg-chip'
    bar.appendChild(chip)
  }
  chip.textContent = userLabel(user)
}

/* ── Modal + small UI helpers (scoped .saiyan-gate*) ── */
let overlay = null

function closeModal() {
  if (overlay) {
    overlay.remove()
    overlay = null
  }
}

function openModal(buildBody) {
  closeModal()
  overlay = document.createElement('div')
  overlay.className = 'saiyan-gate'
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) finish(false)
  })

  const card = document.createElement('div')
  card.className = 'saiyan-gate__card'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')

  const close = document.createElement('button')
  close.className = 'saiyan-gate__close'
  close.type = 'button'
  close.setAttribute('aria-label', 'Close')
  close.textContent = '×'
  close.addEventListener('click', () => finish(false))
  card.appendChild(close)

  buildBody(card)
  overlay.appendChild(card)
  document.body.appendChild(overlay)
}

function heading(card, kicker, title, text) {
  const k = document.createElement('p')
  k.className = 'saiyan-gate__kicker'
  k.textContent = kicker
  const h = document.createElement('h3')
  h.className = 'saiyan-gate__title'
  h.textContent = title
  const p = document.createElement('p')
  p.className = 'saiyan-gate__text'
  p.textContent = text
  card.append(k, h, p)
}

function wrapRow(...nodes) {
  const row = document.createElement('div')
  row.className = 'saiyan-gate__row'
  row.append(...nodes)
  return row
}

function primaryButton(label, onClick) {
  const b = document.createElement('button')
  b.className = 'saiyan-gate__btn saiyan-gate__btn--primary'
  b.type = 'button'
  b.textContent = label
  b.addEventListener('click', onClick)
  return b
}

function ghostButton(label, onClick) {
  const b = document.createElement('button')
  b.className = 'saiyan-gate__btn'
  b.type = 'button'
  b.textContent = label
  b.addEventListener('click', onClick)
  return b
}

// Official-style Telegram button: blue with the white paper-plane logo inline.
function telegramButton(label, onClick) {
  const b = document.createElement('button')
  b.className = 'saiyan-gate__btn saiyan-gate__btn--tg'
  b.type = 'button'
  b.innerHTML =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>'
  const span = document.createElement('span')
  span.textContent = label
  b.appendChild(span)
  b.addEventListener('click', onClick)
  return b
}

function spinner() {
  const s = document.createElement('div')
  s.className = 'saiyan-gate__spinner'
  s.setAttribute('aria-hidden', 'true')
  return s
}
