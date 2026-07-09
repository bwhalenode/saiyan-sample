/* SAIYAN AI — central config. The single place that switches the AI area from
   demo mode to a live backend, and where the future server route is named.
   No secrets here: the API key lives on the server the owner will host. */

// Access gate (Telegram login + Saiyan group membership). Every value here is
// PUBLIC and safe to ship in the browser bundle. The bot TOKEN is never here —
// it lives only on the backend (server/). All values come from Vite env vars,
// so with no .env the gate stays disabled and the demo keeps working.
const AUTH = {
  apiBase: import.meta.env.VITE_AUTH_API_BASE || '',          // e.g. http://localhost:8787
  botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
  joinUrl: import.meta.env.VITE_SAIYAN_JOIN_URL || '',
}
// Only gate generation once the backend + bot username are configured.
AUTH.enabled = Boolean(AUTH.apiBase && AUTH.botUsername)

// Where live generation lives (our own backend; it holds the provider keys).
// Defaults to the auth backend since they are the same server. Unset -> demo.
const GEN_BASE = import.meta.env.VITE_AI_API_BASE || import.meta.env.VITE_AUTH_API_BASE || ''

export const AI_CONFIG = {
  // Demo mode is automatic: no backend configured -> built-in demo output.
  // Configure VITE_AUTH_API_BASE (or VITE_AI_API_BASE) -> real generation.
  demoMode: !GEN_BASE,

  // Our server endpoint. The browser calls THIS, never a provider directly,
  // so no key is ever exposed client-side.
  apiBase: GEN_BASE,

  // Telegram login + membership gate in front of generation (see ai/auth.js).
  auth: AUTH,

  // Output direction is product-controlled, not decided by the model.
  // Motivation is video-first; PFP/Meme are image when their API is wired.
  modes: {
    motivation: {
      label: 'MOOD → POWER UP',
      output: 'video',
      demoAsset: '/videos/motivation-demo.mp4',
      ready: true,                 // works as a product demo right now
    },
    pfp: {
      label: 'PFP',
      output: 'image',
      demoAsset: null,
      ready: false,                // prompt-builder only until image API is wired
    },
    meme: {
      label: 'MEME',
      output: 'image',
      demoAsset: null,
      ready: false,
    },
  },
}

export const DEFAULT_MODE = 'motivation'
