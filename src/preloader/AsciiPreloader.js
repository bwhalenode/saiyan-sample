const CHARS  = '/\\|_-+=*&%$#@()[]{}<>1780※'
const IS_MOB = () => window.innerWidth < 900 || !window.matchMedia('(hover: hover)').matches

function _canUseWebP() {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch { return false }
}

export class AsciiPreloader {
  constructor({ onComplete }) {
    this._onComplete  = onComplete
    this._startTime   = 0
    this._rafId       = null
    this._p           = 0
    this._revealDone  = false
    this._gatePassed  = false
    this._glitchTimer = null

    this._buildDOM()
  }

  // ── DOM ──────────────────────────────────────────────────────────────────

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
      <div class="preloader-hud-top">$SAIYAN // SYS_INIT_v1.0</div>
      <div class="preloader-hud-bottom">
        LOADING [<span class="preloader-bar"></span>]&nbsp;<span class="preloader-pct">0%</span>&nbsp;&mdash;&nbsp;POWER LEVEL RISING
      </div>
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

    this._image.src = _canUseWebP() ? '/images/pre-loader.webp' : '/images/pre-loader.png'
  }

  // ── Entry point ──────────────────────────────────────────────────────────

  start() {
    this._startTime = performance.now()

    // Pre-load hero textures into browser cache so HeroScene is instant on mount
    ;['/images/hero-1.webp', '/images/hero-1.jpg',
      '/images/rage-face.webp', '/images/mid-page.webp'].forEach(src => {
      const img = new Image(); img.src = src
    })

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._reducedMotionReveal()
      return
    }

    this._rafId = requestAnimationFrame(t => this._tick(t))
    this._scheduleGlitch()
  }

  // ── Reveal loop ──────────────────────────────────────────────────────────

  _tick(now) {
    const elapsed  = now - this._startTime
    const duration = IS_MOB() ? 1800 : 2400
    const t        = Math.min(elapsed / duration, 1)
    // easeInOutCubic — gradual start, fastest through middle, eases off at top
    const p = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    this._p = p
    this._applyReveal(p)

    if (t < 1) {
      this._rafId = requestAnimationFrame(ts => this._tick(ts))
    } else {
      this._revealDone = true
      this._stopGlitch()
      console.log(`[preloader] reveal complete @ ${(performance.now() - this._startTime).toFixed(0)}ms`)
      this._checkGate()
    }
  }

  _applyReveal(p) {
    // Bottom-up: clip mask from its bottom edge.
    // inset(0 0 p*100% 0) removes the bottom p*100% of the mask,
    // leaving the top (1-p)*100% covering the image → bottom-up reveal. ✓
    this._mask.style.clipPath = `inset(0 0 ${p * 100}% 0)`

    // Scan line at the reveal edge (bottom of remaining mask = p*100% from bottom)
    this._scan.style.bottom  = `${p * 100}%`
    this._scan.style.opacity = (p > 0.01 && p < 0.99) ? '1' : '0'

    // Bar mirrors reveal progress directly — reliable, no LoadingManager needed
    const pct = Math.round(p * 100)
    this._bar?.style.setProperty('--fill', pct + '%')
    if (this._pctEl) this._pctEl.textContent = pct + '%'
  }

  // ── Glitch characters ────────────────────────────────────────────────────

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
      const el   = document.createElement('span')
      Object.assign(el.style, {
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
      el.textContent = char
      this._glitch.appendChild(el)
      requestAnimationFrame(() => {
        el.style.opacity = '0'
        setTimeout(() => el.remove(), 260)
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

  // ── Gate ─────────────────────────────────────────────────────────────────

  async _checkGate() {
    if (this._gatePassed)  return
    if (!this._revealDone) return
    this._gatePassed = true

    // Race: (fonts ready + 3 s floor from start) vs 5.5 s hard cap
    // This never blocks on LoadingManager — hero scene loads in parallel.
    const elapsed   = performance.now() - this._startTime
    const minRemain = Math.max(0, 3000 - elapsed)
    const capRemain = Math.max(0, 5500 - elapsed)

    await Promise.race([
      Promise.all([
        document.fonts.ready,
        new Promise(r => setTimeout(r, minRemain)),
      ]),
      new Promise(r => setTimeout(r, capRemain)),
    ])

    console.log(`[preloader] gate passed @ ${(performance.now() - this._startTime).toFixed(0)}ms`)

    // Brief hold — let the fully-revealed portrait register
    await new Promise(r => setTimeout(r, 120))

    console.log(`[preloader] exit started @ ${(performance.now() - this._startTime).toFixed(0)}ms`)
    await this._exit()

    console.log(`[preloader] removing DOM @ ${(performance.now() - this._startTime).toFixed(0)}ms`)
    this._el.remove()
    console.log(`[preloader] DOM removed, calling onComplete`)
    this._onComplete()
  }

  // ── Exit transition ───────────────────────────────────────────────────────

  _exit() {
    return new Promise(resolve => {
      // HUD out faster
      const hudTop = this._el.querySelector('.preloader-hud-top')
      const hudBot = this._el.querySelector('.preloader-hud-bottom')
      hudTop.style.transition = 'opacity 0.25s ease'
      hudBot.style.transition = 'opacity 0.25s ease'
      hudTop.style.opacity    = '0'
      hudBot.style.opacity    = '0'

      // Gold flash on portrait
      this._stage.classList.add('preloader-stage--flash')
      setTimeout(() => this._stage?.classList.remove('preloader-stage--flash'), 400)

      // Overlay fade + scale — shortened to 450 ms
      setTimeout(() => {
        this._el.style.transition = 'opacity 0.45s ease, transform 0.45s ease'
        this._el.style.opacity    = '0'
        this._el.style.transform  = 'scale(1.04)'
        setTimeout(resolve, 470)
      }, 50)
    })
  }

  // ── Reduced-motion path ──────────────────────────────────────────────────

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
      this._checkGate()
    }, 700)
  }
}
