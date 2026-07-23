import './creator.css'
import { DEFAULT_MODE, AI_CONFIG } from './ai/config.js'
import { generate } from './ai/service.js'
import { ensureAccess } from './ai/auth.js'
import { authHeaders } from './ai/token.js'

/* SAIYAN CREATOR panel controller.
   Mood -> Power Up is the centrepiece (a chosen team character answers the
   user's situation in a cinematic video); Meme and PFP ride the same flow.
   All generation goes through ai/service.js to our own backend. */
const forge = document.querySelector('[data-forge]')

if (forge) {
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const $ = sel => forge.querySelector(sel)
  const labelEl = $('[data-prompt-label]')
  const inputEl = $('[data-input]')
  const hintEl = $('[data-hint]')
  const loadingTextEl = $('[data-loading-text]')
  const captionEl = $('[data-caption]')
  const resultHintEl = $('[data-result-hint]')
  const conceptPromptEl = $('[data-concept-prompt]')
  const conceptTagEl = $('[data-concept-tag]')
  const video = $('[data-video]')
  const imageEl = $('[data-image]')
  const soundBtn = $('[data-sound]')
  const downloadEl = $('[data-download]')
  const uploadInput = $('[data-upload]')
  const uploadLabel = $('[data-upload-label]')

  const MODE_UI = {
    motivation: {
      label: 'HOW ARE YOU FEELING?',
      placeholder: 'Your mood, a problem, a goal… e.g. “I keep delaying my launch”. Empty = surprise me.',
      hint: 'Your Saiyan responds to you',
      loading: ['BUILD STARTED…', 'IMAGINATION RUNNING…', 'SCENES TAKING SHAPE…', 'FRAMES RENDERING…', 'VOICE AND SOUND SYNCING…', 'READY SHORTLY…'],
      ms: 4000,
      cycleMs: 4200,
      note: 'Video generation takes 1 to 2 minutes',
      requireInput: false,
    },
    pfp: {
      label: 'AWAKEN YOUR SAIYAN PFP',
      placeholder: 'Describe your PFP… e.g. “cyber samurai with a scar”. Add a photo or pick a character.',
      hint: 'Prompt, photo or character → PFP',
      loading: ['SHAPING YOUR WARRIOR…', 'CHARGING THE AURA…', 'POWERING UP…', 'FORGING THE FINAL FORM…'],
      ms: 2600,
      cycleMs: 1100,
      note: 'Usually ready in under a minute',
      requireInput: false,
    },
    meme: {
      label: 'YOUR MEME IDEA',
      placeholder: 'e.g. “when the chart dumps but you keep buying”',
      hint: 'Idea → $SAIYAN meme',
      loading: ['READING THE ROOM…', 'COOKING THE MEME…', 'POWERING UP…', 'ADDING THE PUNCHLINE…'],
      ms: 2600,
      cycleMs: 1100,
      note: 'Usually ready in under a minute',
      requireInput: true,
    },
  }

  const CAPTIONS = [
    'Pain is fuel. Rise, ascend, and prove them wrong.',
    'Down today, unstoppable tomorrow. Channel the Ki.',
    'Every fall sets up a stronger comeback.',
    'The fire you feel is your power waking up.',
  ]

  const state = { mode: DEFAULT_MODE, aura: 'golden', character: 'meketa', captions: true, style: 'cinematic', transform: 'golden', uploadData: null, uploadPromise: null }
  let loadingTimer = null

  const pick = arr => arr[Math.floor(Math.random() * arr.length)]

  /* ── Mode switching ── */
  function setMode(mode) {
    if (!MODE_UI[mode]) return
    state.mode = mode
    forge.dataset.mode = mode
    forge.dataset.state = 'input'

    forge.querySelectorAll('[data-mode-btn]').forEach(b => {
      const on = b.dataset.modeBtn === mode
      b.classList.toggle('is-active', on)
      b.setAttribute('aria-selected', String(on))
    })

    const ui = MODE_UI[mode]
    labelEl.textContent = ui.label
    inputEl.placeholder = ui.placeholder
    hintEl.textContent = ui.hint

    // PFP defaults to Custom (own subject/photo); video needs a real character.
    if (mode === 'pfp' && state.character !== 'custom') selectCharacter('custom')
    if (mode === 'motivation' && state.character === 'custom') selectCharacter('meketa')
  }

  function selectCharacter(id) {
    state.character = id
    forge.querySelectorAll('[data-char-btn]').forEach(b =>
      b.classList.toggle('is-active', b.dataset.charBtn === id))
  }

  forge.querySelectorAll('[data-mode-btn]').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.modeBtn))
  })

  /* ── Guided: aura chips ── */
  forge.querySelectorAll('[data-aura-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.aura = btn.dataset.auraBtn
      forge.querySelectorAll('[data-aura-btn]').forEach(b =>
        b.classList.toggle('is-active', b === btn))
    })
  })

  /* ── Guided: super form. The power-up hair colour the user wants. ── */
  forge.querySelectorAll('[data-transform-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.transform = btn.dataset.transformBtn
      forge.querySelectorAll('[data-transform-btn]').forEach(b =>
        b.classList.toggle('is-active', b === btn))
    })
  })

  /* ── Guided: video look. Cinematic real-world is the deliverable; anime
     stays available for the illustrated style. ── */
  forge.querySelectorAll('[data-style-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.style = btn.dataset.styleBtn
      forge.querySelectorAll('[data-style-btn]').forEach(b =>
        b.classList.toggle('is-active', b === btn))
    })
  })

  /* ── Guided: meme caption on/off. Burned-in text can bury a strong image,
     so the user decides before generating. ── */
  forge.querySelectorAll('[data-captions-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.captions = btn.dataset.captionsBtn === 'on'
      forge.querySelectorAll('[data-captions-btn]').forEach(b =>
        b.classList.toggle('is-active', b === btn))
    })
  })

  /* ── Guided: team character (video: Meketa default; PFP: Custom default) ── */
  forge.querySelectorAll('[data-char-btn]').forEach(btn => {
    btn.addEventListener('click', () => selectCharacter(btn.dataset.charBtn))
  })

  /* ── Guided: PFP photo upload. Downscaled in the browser and sent with the
     generation request so the backend can do the Saiyan transformation while
     keeping the person recognizable. ── */
  if (uploadInput) {
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files && uploadInput.files[0]
      if (!file) return
      uploadLabel.textContent = 'Reading photo…'
      // Kept as a promise so Generate can WAIT for it: clicking generate right
      // after picking a file must never silently drop the photo.
      state.uploadPromise = new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const max = 768
          const scale = Math.min(1, max / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(img.width * scale))
          canvas.height = Math.max(1, Math.round(img.height * scale))
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          state.uploadData = canvas.toDataURL('image/jpeg', 0.88)
          URL.revokeObjectURL(url)
          uploadLabel.textContent = file.name.length > 18 ? file.name.slice(0, 16) + '…' : file.name
          const chip = uploadLabel.closest('.creator__upload')
          chip?.classList.add('has-file')
          // Visible proof the photo is attached: thumbnail in the chip.
          const thumb = chip?.querySelector('[data-upload-thumb]')
          if (thumb) {
            thumb.src = state.uploadData
            thumb.hidden = false
          }
          resolve(true)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          state.uploadData = null
          uploadLabel.textContent = 'Could not read photo'
          resolve(false)
        }
        img.src = url
      })
    })
  }

  /* ── Generate ── */
  async function run() {
    const ui = MODE_UI[state.mode]
    const text = inputEl.value.trim()
    if (ui.requireInput && !text) { inputEl.focus(); return }

    // Telegram login + Saiyan membership gate. No-op (returns true) until the
    // backend is configured, so the demo keeps working without secrets.
    const allowed = await ensureAccess()
    if (!allowed) return

    // A just-picked photo may still be processing: wait for it so it is never
    // silently dropped from the request.
    if (state.mode === 'pfp' && state.uploadPromise) await state.uploadPromise

    const payload = { input: text, opts: { aura: state.aura, character: state.character, captions: state.captions, style: state.style, transform: state.transform } }
    if (state.mode === 'pfp' && state.uploadData) payload.image = state.uploadData

    startLoading(ui)
    let result
    try {
      ;[result] = await Promise.all([generate(state.mode, payload), wait(reduced ? 400 : ui.ms)])
    } catch (e) {
      // Real error, real retry. The prompt, mode and character stay as they are.
      result = { error: e?.code || 'generation_failed', mode: state.mode }
    }
    reveal(result)
  }

  function startLoading(ui) {
    forge.dataset.state = 'loading'
    let i = 0
    loadingTextEl.textContent = ui.loading[0]
    const noteEl = $('[data-loading-note]')
    if (noteEl) noteEl.textContent = ui.note || ''
    clearInterval(loadingTimer)
    if (reduced) return
    loadingTimer = setInterval(() => {
      // Hold on the final message instead of looping back to the start.
      i = Math.min(i + 1, ui.loading.length - 1)
      loadingTextEl.textContent = ui.loading[i]
    }, ui.cycleMs || 1200)
  }

  // Friendly copy for live-generation errors. Nothing is spent on a failure.
  const ERROR_COPY = {
    insufficient_credits: 'You are out of credits. More power is coming soon, warrior.',
    daily_limit: 'You hit the daily limit. Rest up and return stronger tomorrow.',
    job_in_progress: 'One creation at a time. Your last one is still charging.',
    blocked_by_safety: 'That wording did not pass the content check. Nothing was spent. Try saying it a different way.',
    not_logged_in: 'Connect your Telegram to power up.',
    not_member: 'Join the Saiyan Telegram to unlock creations.',
    timed_out: 'The forge took too long. Nothing was spent. Try again.',
    ai_disabled: 'The creator is recharging. Check back soon.',
    service_unavailable: 'The creator is offline right now. Nothing was spent. Try again shortly.',
  }

  function reveal(result) {
    clearInterval(loadingTimer)

    if (result.error) {
      forge.dataset.output = 'concept'
      if (conceptTagEl) conceptTagEl.textContent = 'POWER CHECK'
      conceptPromptEl.textContent = ERROR_COPY[result.error] || 'The forge misfired. Nothing was spent. Try again in a moment.'
      captionEl.textContent = 'Not this time'
      resultHintEl.textContent = 'Nothing was spent'
    } else if (result.output === 'video' && result.asset) {
      forge.dataset.output = 'video'
      // The character's actual spoken line is the caption when we have it.
      captionEl.textContent = result.meta?.line ? `“${result.meta.line}”` : pick(CAPTIONS)
      resultHintEl.textContent = `${result.meta?.character ? result.meta.character + ' · ' : ''}Generated`
      playVideo(result.asset)
    } else if (result.output === 'image' && result.asset) {
      forge.dataset.output = 'image'
      captionEl.textContent = state.mode === 'pfp'
        ? 'Your Saiyan PFP is awakened.'
        : 'Your $SAIYAN meme is ready.'
      resultHintEl.textContent = `${result.meta?.character ? result.meta.character + ' · ' : ''}${result.free ? 'Generated · free creation' : 'Generated'}`
      showImage(result.asset)
    } else {
      // No asset and no specific error code: treat as a failed generation.
      forge.dataset.output = 'concept'
      if (conceptTagEl) conceptTagEl.textContent = 'POWER CHECK'
      conceptPromptEl.textContent = 'The forge misfired. Nothing was spent. Try again in a moment.'
      captionEl.textContent = 'Not this time'
      resultHintEl.textContent = 'Nothing was spent'
    }

    forge.dataset.state = 'reveal'
  }

  /* ── Image output (PFP / Meme, live generation) ── */
  function showImage(src) {
    forge.classList.remove('has-video', 'has-image')
    soundBtn.hidden = true
    if (downloadEl) {
      downloadEl.setAttribute('href', src)
      downloadEl.setAttribute('download', state.mode === 'pfp' ? 'saiyan-pfp.png' : 'saiyan-meme.png')
    }
    if (!imageEl) return
    imageEl.onload = () => forge.classList.add('has-image')
    imageEl.onerror = () => forge.classList.remove('has-image')
    imageEl.src = src
  }

  /* ── Video output (Multi-Motivation) ── */
  function setSound(muted) {
    if (!video) return
    video.muted = muted
    soundBtn.classList.toggle('is-muted', muted)
    soundBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute')
  }

  function playVideo(src) {
    forge.classList.remove('has-video', 'has-image')
    soundBtn.hidden = true
    if (downloadEl) {
      downloadEl.setAttribute('href', src)
      downloadEl.setAttribute('download', 'saiyan-motivation.mp4')
    }
    video.setAttribute('src', src)

    video.onloadeddata = () => {
      forge.classList.add('has-video')
      video.muted = false                       // the GENERATE click is the gesture
      const p = video.play()
      if (p && p.then) {
        p.then(() => { setSound(false); soundBtn.hidden = false })
         .catch(() => { setSound(true); video.play().catch(() => {}); soundBtn.hidden = false })
      } else { setSound(false); soundBtn.hidden = false }
    }
    video.onerror = () => { forge.classList.remove('has-video') }  // missing file -> placeholder
    video.load()
  }

  soundBtn?.addEventListener('click', () => {
    const next = !video.muted
    setSound(next)
    if (!next) video.play().catch(() => {})
  })

  /* ── Direct download. The download attribute is ignored cross-origin, so the
     asset is fetched as a blob and saved straight to the device. ── */
  downloadEl?.addEventListener('click', async (e) => {
    const href = downloadEl.getAttribute('href')
    if (!href || href === '#') return
    e.preventDefault()
    downloadEl.classList.add('is-busy')
    try {
      const res = await fetch(href)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadEl.getAttribute('download') || 'saiyan-creation'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (err) {
      // Fallback: let the browser open it normally.
      window.open(href, '_blank', 'noopener')
    } finally {
      downloadEl.classList.remove('is-busy')
    }
  })

  /* ── Reset ── */
  function reset() {
    clearInterval(loadingTimer)
    try { video && video.pause() } catch (e) {}
    forge.classList.remove('has-video', 'has-image')
    forge.dataset.state = 'input'
    inputEl.focus()
  }

  /* ── Gallery: the logged-in user's past creations ── */
  async function openGallery() {
    const base = AI_CONFIG.apiBase.replace(/\/$/, '')
    if (!base) return

    const overlay = document.createElement('div')
    overlay.className = 'saiyan-gate'
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
    const card = document.createElement('div')
    card.className = 'saiyan-gate__card saiyan-gate__card--gallery'
    card.setAttribute('role', 'dialog')
    card.innerHTML =
      '<button class="saiyan-gate__close" type="button" aria-label="Close">×</button>' +
      '<p class="saiyan-gate__kicker">SAIYAN CREATOR</p>' +
      '<h3 class="saiyan-gate__title">My creations</h3>' +
      '<div class="creator__gallery-grid"><p class="saiyan-gate__text">Loading…</p></div>'
    card.querySelector('.saiyan-gate__close').addEventListener('click', () => overlay.remove())
    overlay.appendChild(card)
    document.body.appendChild(overlay)

    const grid = card.querySelector('.creator__gallery-grid')
    try {
      const res = await fetch(`${base}/api/ai/history`, { credentials: 'include', headers: authHeaders() })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'failed')
      grid.textContent = ''
      if (!data.items.length) {
        grid.innerHTML = '<p class="saiyan-gate__text">Nothing here yet. Generate your first creation.</p>'
        return
      }
      for (const item of data.items) {
        const tile = document.createElement('a')
        tile.className = 'creator__gallery-item'
        tile.href = `${base}${item.assetUrl}`
        tile.target = '_blank'
        tile.rel = 'noopener'
        if (item.kind === 'video') {
          const v = document.createElement('video')
          v.src = `${base}${item.assetUrl}`
          v.muted = true
          v.playsInline = true
          v.preload = 'metadata'
          v.addEventListener('mouseenter', () => v.play().catch(() => {}))
          v.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0 })
          tile.appendChild(v)
        } else {
          const img = document.createElement('img')
          img.src = `${base}${item.assetUrl}`
          img.loading = 'lazy'
          img.alt = item.mode
          tile.appendChild(img)
        }
        const label = document.createElement('span')
        const d = new Date(item.createdAt)
        label.textContent = `${item.mode === 'motivation' ? 'VIDEO' : item.mode.toUpperCase()} · ${d.getDate()}/${d.getMonth() + 1}`
        tile.appendChild(label)
        grid.appendChild(tile)
      }
    } catch {
      grid.innerHTML = '<p class="saiyan-gate__text">Could not load your creations. Connect Telegram and try again.</p>'
    }
  }

  document.querySelector('[data-gallery]')?.addEventListener('click', openGallery)

  $('[data-generate]')?.addEventListener('click', run)
  $('[data-again]')?.addEventListener('click', reset)
  inputEl.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run()
  })

  setMode(DEFAULT_MODE)
}
