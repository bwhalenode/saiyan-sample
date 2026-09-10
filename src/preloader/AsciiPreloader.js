const CHARS  = '/\\|_-+=*&%$#@()[]{}<>1780※'
const IS_MOB = () => window.innerWidth < 900 || !window.matchMedia('(hover: hover)').matches
const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Hero assets that must be cached/ready before we let the user tap through.
const READY_ASSETS = [
  '/images/hero-1.webp', '/images/hero-1.jpg', '/images/hero-1-mobile.webp',
  '/images/logo.webp', '/images/mid-page.webp',
]

function _canUseWebP() {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch { return false }
}

const wait = ms => new Promise(r => setTimeout(r, ms))

export class AsciiPreloader {
  constructor({ onComplete, onAwaken }) {
    this._onComplete  = onComplete
    this._onAwaken    = onAwaken
    this._startTime   = 0
    this._rafId       = null
    this._p           = 0
    this._revealDone  = false
    this._loaded      = false
    this._armed       = false   // tap prompt shown + click handler attached
    this._loadingShown = false
    this._bursting    = false
    this._done        = false
    this._glitchTimer = null

    this._buildDOM()
  }

  // DOM
  _buildDOM() {
    const el = document.createElement('div')
    el.className = 'preloader'
    el.innerHTML = `
      <div class="preloader-stage">
        <img class="preloader-image" alt="" />
        <div class="preloader-mask"></div>
        <div class="preloader-scan"></div>
        <div class="preloader-glitch"></div>
      </div>
      <div class="preloader-flash" aria-hidden="true"></div>
      <div class="preloader-shock" aria-hidden="true"></div>
      <div class="preloader-hud-top">$SAIYAN // SYS_INIT_v1.0</div>
      <div class="preloader-hud-bottom">
        LOADING [<span class="preloader-bar"></span>]&nbsp;<span class="preloader-pct">0%</span>&nbsp;&mdash;&nbsp;POWER LEVEL RISING
      </div>
      <div class="preloader-prompt" aria-live="polite"></div>
    `
    document.body.insertAdjacentElement('afterbegin', el)

    this._el     = el
    this._stage  = el.querySelector('.preloader-stage')
    this._image  = el.querySelector('.preloader-image')
    this._mask   = el.querySelector('.preloader-mask')
    this._scan   = el.querySelector('.preloader-scan')
    this._glitch = el.querySelector('.preloader-glitch')
    this._bar    = el.querySelector('.preloader-bar')
    this._pctEl  = el.querySelector('.preloader-pct')
    this._hudTop = el.querySelector('.preloader-hud-top')
    this._hudBot = el.querySelector('.preloader-hud-bottom')
    this._prompt = el.querySelector('.preloader-prompt')

    this._image.src = _canUseWebP() ? '/images/pre-loader.webp' : '/images/pre-loader.png'
  }

  // Entry point
  start() {
    this._startTime = performance.now()
    this._trackReady()

    if (REDUCED()) {
      this._reducedMotionReveal()
      return
    }

    this._rafId = requestAnimationFrame(t => this._tick(t))
    this._scheduleGlitch()
  }

  // Readiness: wait for hero assets + fonts (capped), then maybe show tap
  _trackReady() {
    const assetLoads = READY_ASSETS.map(src => new Promise(res => {
      const img = new Image()
      img.onload = img.onerror = () => res()
      img.src = src
    }))

    const ready = Promise.race([
      Promise.all([document.fonts.ready, ...assetLoads]),
      wait(6000),                       // hard cap so we never hang
    ])
    const minFloor = wait(500)          // tiny floor so the reveal can breathe

    Promise.all([ready, minFloor]).then(() => {
      this._loaded = true
      this._maybeShowPrompt()
    })
  }

  // Reveal loop
  _tick(now) {
    const elapsed  = now - this._startTime
    const duration = IS_MOB() ? 1800 : 2400
    const t        = Math.min(elapsed / duration, 1)
    const p = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    this._p = p
    this._applyReveal(p)

    if (t < 1) {
      this._rafId = requestAnimationFrame(ts => this._tick(ts))
    } else {
      this._revealDone = true
      this._stopGlitch()
      this._maybeShowPrompt()
    }
  }

  _applyReveal(p) {
    this._mask.style.clipPath = `inset(0 0 ${p * 100}% 0)`
    this._scan.style.bottom  = `${p * 100}%`
    this._scan.style.opacity = (p > 0.01 && p < 0.99) ? '1' : '0'

    const pct = Math.round(p * 100)
    this._bar?.style.setProperty('--fill', pct + '%')
    if (this._pctEl) this._pctEl.textContent = pct + '%'
  }

  // Glitch characters
  _spawnGlitchChars(p) {
    if (!this._glitch || !this._stage) return
    const mob    = IS_MOB()
    const count  = mob ? 4 + Math.floor(Math.random() * 4)
                       : 8 + Math.floor(Math.random() * 8)
    const stageH = this._stage.offsetHeight
    const stageW = this._stage.offsetWidth
    const scanPx = p * stageH
    const bandPx = stageH * 0.15

    for (let i = 0; i < count; i++) {
      const char = CHARS[Math.floor(Math.random() * CHARS.length)]
      const span = document.createElement('span')
      Object.assign(span.style, {
        position:      'absolute',
        left:          `${(Math.random() * Math.max(stageW - 12, 0)).toFixed(0)}px`,
        bottom:        `${(scanPx + Math.random() * bandPx).toFixed(0)}px`,
        fontFamily:    '"JetBrains Mono", monospace',
        fontSize:      `${10 + Math.floor(Math.random() * 4)}px`,
        color:         Math.random() > 0.5 ? '#FFD230' : '#E8E8E8',
        opacity:       '1',
        pointerEvents: 'none',
        lineHeight:    '1',
        transition:    'opacity 250ms ease-out',
      })
      span.textContent = char
      this._glitch.appendChild(span)
      requestAnimationFrame(() => {
        span.style.opacity = '0'
        setTimeout(() => span.remove(), 260)
      })
    }
  }

  _scheduleGlitch() {
    this._glitchTimer = setInterval(() => {
      if (!this._revealDone) this._spawnGlitchChars(this._p)
    }, 60)
  }

  _stopGlitch() {
    clearInterval(this._glitchTimer)
    this._glitchTimer = null
    if (this._glitch) this._glitch.innerHTML = ''
  }

  // Tap gate
  _maybeShowPrompt() {
    if (this._armed || this._bursting || this._done) return
    if (!this._revealDone) return

    if (this._loaded) {
      // Page behind is ready → invite the tap.
      this._armed = true
      this._prompt.textContent = 'TAP TO AWAKEN'
      this._prompt.classList.remove('is-loading')
      this._prompt.classList.add('is-ready')
      this._hudBot.style.transition = 'opacity 0.4s ease'
      this._hudBot.style.opacity = '0'
      this._el.classList.add('is-ready')

      this._tapHandler = () => this._onTap()
      this._el.addEventListener('click', this._tapHandler)
      this._keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._onTap() }
      }
      window.addEventListener('keydown', this._keyHandler)
    } else if (!this._loadingShown) {
      // Reveal finished but assets still loading → subtle holding state, no tap yet.
      this._loadingShown = true
      this._prompt.textContent = 'POWERING UP'
      this._prompt.classList.add('is-loading')
    }
  }

  _onTap() {
    if (this._bursting || this._done) return
    this._bursting = true
    this._onAwaken?.()   // start the anthem within the tap gesture so audio is allowed
    this._el.removeEventListener('click', this._tapHandler)
    window.removeEventListener('keydown', this._keyHandler)
    this._el.classList.remove('is-ready')
    this._burst()
  }

  // Transformation burst
  async _burst() {
    // Hide prompt + HUD as the burst begins.
    this._prompt.classList.remove('is-ready')
    this._prompt.style.opacity = '0'
    this._hudTop.style.transition = 'opacity 0.2s ease'
    this._hudTop.style.opacity = '0'

    if (REDUCED()) {
      // Reduced motion: skip the shockwave/shake, quick fade, still gated on tap.
      this._el.style.transition = 'opacity 0.3s ease'
      this._el.style.opacity = '0'
      await wait(320)
      this._finish()
      return
    }

    // 1) Flare, the crystal surges bright (~300ms).
    this._stage.classList.add('preloader-stage--flare')

    // 2) Shockwave + flash (+ shake) fire mid-flare.
    await wait(250)
    this._el.classList.add('preloader--burst')

    // 3) Wipe the whole overlay away, revealing the hero underneath.
    await wait(260)
    this._el.style.transition = 'opacity 0.4s ease, transform 0.4s ease'
    this._el.style.opacity   = '0'
    this._el.style.transform = 'scale(1.06)'

    await wait(420)
    this._finish()
  }

  _finish() {
    if (this._done) return
    this._done = true
    this._el.remove()
    this._onComplete()
  }

  // Reduced-motion path
  _reducedMotionReveal() {
    this._mask.style.display   = 'none'
    this._scan.style.display   = 'none'
    this._glitch.style.display = 'none'
    this._bar?.style.setProperty('--fill', '100%')
    if (this._pctEl) this._pctEl.textContent = '100%'

    this._image.style.opacity    = '0'
    this._image.style.transition = 'opacity 600ms ease'
    requestAnimationFrame(() => { this._image.style.opacity = '1' })

    setTimeout(() => {
      this._revealDone = true
      this._maybeShowPrompt()
    }, 700)
  }
}
