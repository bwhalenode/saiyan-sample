/* SAIYAN AI — access gate (browser side).
   Sits in front of the Generate flow: Telegram login + Saiyan group membership.
   Talks ONLY to our own backend (AI_CONFIG.auth.apiBase); it never sees the bot
   token. When the backend isn't configured the gate is a no-op so the live demo
   keeps working — nothing here can crash the site. */

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

/* ── The gate the Generate button awaits ──
   Resolves true when the user may proceed, false when a modal was shown. */
export async function ensureAccess() {
  // Backend not wired yet -> let the demo run, but make the TODO visible in dev.
  if (!cfg.enabled) {
    if (import.meta.env.DEV) {
      console.info('[saiyan-auth] gate disabled (set VITE_AUTH_API_BASE + VITE_TELEGRAM_BOT_USERNAME to enable).')
    }
    return true
  }

  try {
    const session = await apiGet('/api/session')
    if (!session || !session.user) {
      openLogin()
      return false
    }
    const membership = await apiGet('/api/membership')
    if (membership && membership.isMember) return true
    openMembership(membership?.joinUrl || cfg.joinUrl)
    return false
  } catch {
    openNotice('Saiyan access service is unreachable right now. Please try again shortly.')
    return false
  }
}

/* ── Modal plumbing (scoped .saiyan-gate*, isolated from the site) ── */
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
    if (e.target === overlay) closeModal()
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
  close.addEventListener('click', closeModal)
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

// Telegram login widget. On success it posts the signed payload to the backend,
// which verifies it and sets the session cookie.
function openLogin() {
  openModal((card) => {
    heading(
      card,
      'SAIYAN AI',
      'Login with Telegram',
      'Sign in with Telegram to unlock Saiyan AI. We only check your login and Saiyan group membership.',
    )

    const slot = document.createElement('div')
    slot.className = 'saiyan-gate__widget'
    card.appendChild(slot)

    window.__saiyanOnTelegramAuth = async (user) => {
      const r = await apiPost('/api/auth/telegram', user).catch(() => ({ ok: false }))
      if (r && r.ok) {
        closeModal()
        // Re-check now that the session exists; surfaces the membership step if needed.
        ensureAccess()
      } else {
        openNotice('Your Telegram login could not be verified. Please try again.')
      }
    }

    const s = document.createElement('script')
    s.async = true
    s.src = 'https://telegram.org/js/telegram-widget.js?22'
    s.setAttribute('data-telegram-login', cfg.botUsername)
    s.setAttribute('data-size', 'large')
    s.setAttribute('data-userpic', 'false')
    s.setAttribute('data-request-access', 'write')
    s.setAttribute('data-onauth', '__saiyanOnTelegramAuth(user)')
    slot.appendChild(s)
  })
}

// Logged in but not in the group: Join + Check Again.
function openMembership(joinUrl) {
  openModal((card) => {
    heading(
      card,
      'ONE STEP LEFT',
      'Join the Saiyan Telegram',
      'You are logged in, but Saiyan AI is for group members. Join the Telegram, then check again.',
    )

    const row = document.createElement('div')
    row.className = 'saiyan-gate__row'

    const join = document.createElement('a')
    join.className = 'saiyan-gate__btn saiyan-gate__btn--primary'
    join.href = joinUrl || '#'
    join.target = '_blank'
    join.rel = 'noopener'
    join.textContent = 'Join Telegram'

    const again = document.createElement('button')
    again.className = 'saiyan-gate__btn'
    again.type = 'button'
    again.textContent = 'Check Again'
    again.addEventListener('click', async () => {
      again.disabled = true
      again.textContent = 'Checking…'
      const membership = await apiGet('/api/membership').catch(() => null)
      if (membership && membership.isMember) {
        closeModal()
      } else {
        again.disabled = false
        again.textContent = 'Check Again'
        again.classList.add('saiyan-gate__btn--shake')
        setTimeout(() => again.classList.remove('saiyan-gate__btn--shake'), 500)
      }
    })

    row.append(join, again)
    card.appendChild(row)
  })
}

function openNotice(message) {
  openModal((card) => {
    heading(card, 'SAIYAN AI', 'Hold on', message)
    const ok = document.createElement('button')
    ok.className = 'saiyan-gate__btn saiyan-gate__btn--primary'
    ok.type = 'button'
    ok.textContent = 'OK'
    ok.addEventListener('click', closeModal)
    card.appendChild(ok)
  })
}
