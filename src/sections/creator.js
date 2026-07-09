import './creator.css'
import { AI_CONFIG, DEFAULT_MODE } from './ai/config.js'
import { buildPrompt } from './ai/prompts.js'
import { generate } from './ai/service.js'
import { ensureAccess } from './ai/auth.js'

/* SAIYAN AI panel controller.
   Multi-Motivation is the centrepiece (mood -> cinematic Super Saiyan video).
   PFP and Meme are secondary: they build a structured prompt and show it until
   the image API is wired. All generation goes through ai/service.js, so the only
   thing to change when the backend lands is AI_CONFIG.demoMode. */
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
  const video = $('[data-video]')
  const imageEl = $('[data-image]')
  const soundBtn = $('[data-sound]')
  const downloadEl = $('[data-download]')
  const uploadInput = $('[data-upload]')
  const uploadLabel = $('[data-upload-label]')

  const MODE_UI = {
    motivation: {
      label: 'HOW ARE YOU FEELING?',
      placeholder: 'Describe your mood today… e.g. “I feel like giving up”',
      hint: 'Mood → motivational video',
      loading: ['READING YOUR ENERGY…', 'CHANNELLING THE KI…', 'AWAKENING YOUR COMEBACK…', 'POWERING UP…', 'RENDERING YOUR SHORT…', 'ALMOST THERE, STAY STRONG…'],
      ms: 4000,
      requireInput: true,
    },
    pfp: {
      label: 'AWAKEN YOUR SAIYAN PFP',
      placeholder: 'Optional style notes… e.g. “battle scars, scouter, hood”',
      hint: 'Photo → Saiyan PFP',
      loading: ['SHAPING YOUR WARRIOR…', 'CHARGING THE AURA…', 'POWERING UP…', 'FORGING THE FINAL FORM…'],
      ms: 2600,
      requireInput: false,
    },
    meme: {
      label: 'YOUR MEME IDEA',
      placeholder: 'e.g. “when the chart dumps but you keep buying”',
      hint: 'Idea → $SAIYAN meme',
      loading: ['READING THE ROOM…', 'COOKING THE MEME…', 'POWERING UP…', 'ADDING THE PUNCHLINE…'],
      ms: 2600,
      requireInput: true,
    },
  }

  const CAPTIONS = [
    'Pain is fuel. Rise, ascend, and prove them wrong.',
    'Down today, unstoppable tomorrow. Channel the Ki.',
    'Every fall sets up a stronger comeback.',
    'The fire you feel is your power waking up.',
  ]

  const state = { mode: DEFAULT_MODE, aura: 'golden', uploadUrl: null }
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

  /* ── Guided: PFP photo upload (preview only; nothing leaves the browser) ── */
  if (uploadInput) {
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files && uploadInput.files[0]
      if (!file) return
      if (state.uploadUrl) URL.revokeObjectURL(state.uploadUrl)
      state.uploadUrl = URL.createObjectURL(file)
      uploadLabel.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name
      uploadLabel.closest('.creator__upload')?.classList.add('has-file')
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

    const built = buildPrompt(state.mode, text, { aura: state.aura, hasUpload: !!state.uploadUrl })
    const payload = { input: text, opts: { aura: state.aura }, built }

    startLoading(ui)
    let result
    try {
      ;[result] = await Promise.all([generate(state.mode, payload), wait(reduced ? 400 : ui.ms)])
    } catch (e) {
      if (AI_CONFIG.demoMode) {
        result = { demo: true, mode: state.mode, output: AI_CONFIG.modes[state.mode].output, asset: null, ready: false, prompt: built }
      } else {
        result = { error: e?.code || 'generation_failed', mode: state.mode }
      }
    }
    reveal(result, built)
  }

  function startLoading(ui) {
    forge.dataset.state = 'loading'
    let i = 0
    loadingTextEl.textContent = ui.loading[0]
    clearInterval(loadingTimer)
    if (reduced) return
    loadingTimer = setInterval(() => {
      i = (i + 1) % ui.loading.length
      loadingTextEl.textContent = ui.loading[i]
    }, Math.max(700, Math.floor(ui.ms / ui.loading.length)))
  }

  // Friendly copy for live-generation errors. Nothing is spent on a failure.
  const ERROR_COPY = {
    insufficient_credits: 'You are out of credits. More power is coming soon, warrior.',
    daily_limit: 'You hit the daily limit. Rest up and return stronger tomorrow.',
    job_in_progress: 'One creation at a time. Your last one is still charging.',
    blocked_by_safety: 'That idea could not pass the guardians. Try a different one.',
    not_logged_in: 'Connect your Telegram to power up.',
    not_member: 'Join the Saiyan Telegram to unlock creations.',
    timed_out: 'The forge took too long. Nothing was spent. Try again.',
    ai_disabled: 'Saiyan AI is recharging. Check back soon.',
  }

  function reveal(result, payload) {
    clearInterval(loadingTimer)

    if (result.error) {
      forge.dataset.output = 'concept'
      conceptPromptEl.textContent = ERROR_COPY[result.error] || 'The forge misfired. Nothing was spent. Try again in a moment.'
      captionEl.textContent = 'Hold on'
      resultHintEl.textContent = 'Try again'
    } else if (result.output === 'video' && result.asset) {
      forge.dataset.output = 'video'
      captionEl.textContent = pick(CAPTIONS)
      resultHintEl.textContent = result.demo ? 'Demo · sample output' : 'Generated'
      playVideo(result.asset)
    } else if (result.output === 'image' && result.asset) {
      forge.dataset.output = 'image'
      captionEl.textContent = state.mode === 'pfp'
        ? 'Your Saiyan PFP is awakened.'
        : 'Your $SAIYAN meme is ready.'
      resultHintEl.textContent = result.free ? 'Generated · free creation' : 'Generated'
      showImage(result.asset)
    } else {
      // Demo path for PFP / Meme: show the structured prompt that WILL be sent.
      forge.dataset.output = 'concept'
      conceptPromptEl.textContent = payload.prompt
      captionEl.textContent = state.mode === 'pfp'
        ? 'Your Saiyan PFP is awakened.'
        : 'Your $SAIYAN meme is ready.'
      resultHintEl.textContent = 'Blueprint ready'
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

  /* ── Reset ── */
  function reset() {
    clearInterval(loadingTimer)
    try { video && video.pause() } catch (e) {}
    forge.classList.remove('has-video', 'has-image')
    forge.dataset.state = 'input'
    inputEl.focus()
  }

  $('[data-generate]')?.addEventListener('click', run)
  $('[data-again]')?.addEventListener('click', reset)
  inputEl.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run()
  })

  setMode(DEFAULT_MODE)
}
