/* SAIYAN CREATOR — central config. No secrets here: the provider keys live on
   the backend server; the browser only ever calls our own API. */

// Access gate (Telegram login + Saiyan group membership). Every value here is
// PUBLIC and safe to ship in the browser bundle. The bot TOKEN is never here.
const AUTH = {
  apiBase: import.meta.env.VITE_AUTH_API_BASE || '',          // e.g. http://localhost:8787
  botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
  joinUrl: import.meta.env.VITE_SAIYAN_JOIN_URL || '',
}
// Only gate generation once the backend + bot username are configured.
AUTH.enabled = Boolean(AUTH.apiBase && AUTH.botUsername)

// Where generation lives (our own backend; it holds the provider keys).
// Defaults to the auth backend since they are the same server.
const GEN_BASE = import.meta.env.VITE_AI_API_BASE || import.meta.env.VITE_AUTH_API_BASE || ''

export const AI_CONFIG = {
  // Our server endpoint. The browser calls THIS, never a provider directly,
  // so no key is ever exposed client-side. Unset -> generation shows a real
  // "creator offline" error; there is no demo fallback.
  apiBase: GEN_BASE,

  // Telegram login + membership gate in front of generation (see ai/auth.js).
  auth: AUTH,

  // Output direction is product-controlled, not decided by the model.
  modes: {
    motivation: { label: 'MOOD → POWER UP', output: 'video' },
    pfp: { label: 'PFP', output: 'image' },
    meme: { label: 'MEME', output: 'image' },
  },
}

export const DEFAULT_MODE = 'motivation'
