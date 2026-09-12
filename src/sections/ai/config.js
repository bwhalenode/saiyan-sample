// Public browser configuration. Provider credentials belong on the backend.

// Telegram login and community membership settings.
const AUTH = {
  apiBase: import.meta.env.VITE_AUTH_API_BASE || '', // e.g. http://localhost:8787
  botUsername: import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '',
  joinUrl: import.meta.env.VITE_SAIYAN_JOIN_URL || '',
}
// Only gate generation once the backend + bot username are configured.
AUTH.enabled = Boolean(AUTH.apiBase && AUTH.botUsername)

// Where generation lives (our own backend; it holds the provider keys).
// Defaults to the auth backend since they are the same server.
const GEN_BASE = import.meta.env.VITE_AI_API_BASE || import.meta.env.VITE_AUTH_API_BASE || ''

export const AI_CONFIG = {
  // An unset endpoint makes generation report that the service is offline.
  apiBase: GEN_BASE,

  // Telegram login + membership gate in front of generation (see ai/auth.js).
  auth: AUTH,

  // Output direction is product-controlled, not decided by the model.
  // `api` is the mode the backend knows; Mood and Fight are two front-end tabs
  // over the same video endpoint, separated only by the scene they request.
  modes: {
    motivation: { label: 'MOOD', output: 'video', api: 'motivation', scene: 'motivation' },
    fight: { label: 'FIGHT', output: 'video', api: 'motivation', scene: 'fight' },
    pfp: { label: 'PFP', output: 'image', api: 'pfp' },
    meme: { label: 'MEME', output: 'image', api: 'meme' },
  },
}

export const DEFAULT_MODE = 'motivation'
