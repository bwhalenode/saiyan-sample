/* SAIYAN AI — service layer. The ONE seam between the UI and generation.
   Demo mode (no backend configured): returns built-in demo results instantly.
   Live mode: POST /api/ai/generate on our backend -> poll /api/ai/status until
   the job finishes -> resolve with the asset URL. The provider keys live only
   on that server; the browser never sees them. */
import { AI_CONFIG } from './config.js'
import { authHeaders } from './token.js'

const base = () => AI_CONFIG.apiBase.replace(/\/$/, '')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

class GenError extends Error {
  constructor(code, extra = {}) {
    super(code)
    this.code = code
    Object.assign(this, extra)
  }
}

/**
 * @param {'motivation'|'pfp'|'meme'} mode
 * @param {{ input:string, opts:{aura:string}, built:object }} payload
 */
export async function generate(mode, payload) {
  const modeCfg = AI_CONFIG.modes[mode]

  if (AI_CONFIG.demoMode || !AI_CONFIG.apiBase) {
    return demoResult(mode, modeCfg, payload)
  }

  // Start the job.
  const res = await fetch(`${base()}/api/ai/generate`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ mode, input: payload.input, opts: payload.opts, image: payload.image }),
  })
  const started = await res.json().catch(() => ({}))
  if (!res.ok || !started.ok) {
    throw new GenError(started.error || `http_${res.status}`, { status: res.status, joinUrl: started.joinUrl })
  }

  // Poll until done. Videos take minutes; images usually well under a minute.
  const isVideo = started.kind === 'video'
  const interval = isVideo ? 5000 : 2500
  const deadline = Date.now() + (isVideo ? 12 : 5) * 60_000

  while (Date.now() < deadline) {
    await wait(interval)
    const sr = await fetch(`${base()}/api/ai/status?jobId=${encodeURIComponent(started.jobId)}`, {
      credentials: 'include',
      headers: authHeaders(),
    })
    const s = await sr.json().catch(() => ({}))
    if (!sr.ok || !s.ok) throw new GenError(s.error || `http_${sr.status}`)
    if (s.status === 'error') throw new GenError(s.error || 'generation_failed')
    if (s.status === 'done' && s.assetUrl) {
      return {
        demo: false,
        mode,
        output: s.kind === 'video' ? 'video' : 'image',
        asset: `${base()}${s.assetUrl}`,
        free: started.free,
        prompt: payload.built,
      }
    }
  }
  throw new GenError('timed_out')
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
    prompt: payload.built || payload,
  })
}
