/* SAIYAN AI — service layer. The ONE seam between the UI and generation.
   Today it returns built-in demo results. When the backend is live, flip
   AI_CONFIG.demoMode to false and this will POST to AI_CONFIG.apiBase instead.
   The browser only ever talks to our own server route, so no key is exposed. */
import { AI_CONFIG } from './config.js'

/**
 * @param {'motivation'|'pfp'|'meme'} mode
 * @param {object} payload  the structured prompt object from prompts.js
 * @returns {Promise<{ demo:boolean, mode:string, output:string, asset:(string|null), prompt:object }>}
 */
export async function generate(mode, payload) {
  const modeCfg = AI_CONFIG.modes[mode]

  if (AI_CONFIG.demoMode || !modeCfg.ready || !AI_CONFIG.apiBase) {
    return demoResult(mode, modeCfg, payload)
  }

  // ── Future live path (server route the owner will add) ──
  // The server holds the real provider key and returns { output, asset/url }.
  const res = await fetch(`${AI_CONFIG.apiBase}/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode, prompt: payload }),
  })
  if (!res.ok) throw new Error(`AI service ${res.status}`)
  return res.json()
}

function demoResult(mode, modeCfg, payload) {
  // Resolve quickly; the visible "charging" time is paced by the UI so the
  // power-up animation always reads, independent of real latency.
  return Promise.resolve({
    demo: true,
    mode,
    output: modeCfg.output,
    asset: modeCfg.demoAsset,
    ready: modeCfg.ready,
    prompt: payload,
  })
}
