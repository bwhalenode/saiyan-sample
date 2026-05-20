import * as THREE from 'three'

const CHARS    = '/\\|_-+=*&%$#@()[]{}<>1780※'
const IS_MOB   = () => window.innerWidth < 900 || !window.matchMedia('(hover: hover)').matches

function _canUseWebP() {
  try {
    const c = document.createElement('canvas')
    c.width  = c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch { return false }
}

export class AsciiPreloader {
  constructor({ onComplete }) {
    this._onComplete    = onComplete
    this._startTime     = 0
    this._rafId         = null
    this._p             = 0       // reveal progress [0,1]
    this._pct           = 0       // asset load %
    this._revealDone    = false
    this._assetsLoaded  = false
    this._gatePassed    = false
    this._glitchTimer   = null

    this._buildDOM()
    this._hookLoadingManager()
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

    const webp        = _canUseWebP()
    this._image.src   = webp ? '/images/pre-loader.webp' : '/images/pre-loader.png'
  }

  // ── Loading manager hook ─────────────────────────────────────────────────

  _hookLoadingManager() {
    const mgr = THREE.DefaultLoadingManager

    mgr.onProgress = (_url, loaded, total) => {
      this._pct = Math.round((loaded / total) * 100)
      this._updateBar()
    }

    mgr.onLoad = () => {
      this._pct = 100
      this._updateBar()
      this._assetsLoaded = true
      this._checkGate()
    }

    // Hard timeout — prevents infinite stall if manager never fires
    setTimeout(() => {
      if (!this._assetsLoaded) {
        this._assetsLoaded = true
        this._checkGate()
      }
    }, 15_000)
  }

  _updateBar() {
    this._bar?.style.setProperty('--fill', this._pct + '%')
    if (this._pctEl) this._pctEl.textContent = this._pct + '%'
  }

  // ── Entry point ──────────────────────────────────────────────────────────

  start() {
    this._startTime = performance.now()

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
    // easeInOutCubic — gradual start, faster through the middle, eases off at top
    const p        = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    this._p = p
    this._applyReveal(p)

    if (t < 1) {
      this._rafId = requestAnimationFrame(ts => this._tick(ts))
    } else {
      this._revealDone = true
      this._stopGlitch()
      this._checkGate()
    }
  }

  _applyReveal(p) {
    // Bottom-up: clip the mask from the bottom edge upward.
    // inset(top right bottom left) on the mask div:
    //   bottom = p*100% clips the mask from its bottom edge.
    //   At p=0 → mask fills stage entirely (image hidden).
    //   At p=1 → mask fully clipped from bottom (image fully visible).
    //   Visible mask = top (1-p)*100% → image revealed bottom-first. ✓
    this._mask.style.clipPath = `inset(0 0 ${p * 100}% 0)`

    // Scan line rides the bottom edge of the remaining mask.
    // Mask bottom edge from top = (1-p)*100%;  from bottom = p*100%.
    this._scan.style.bottom  = `${p * 100}%`
    this._scan.style.opacity = (p > 0.01 && p < 0.99) ? '1' : '0'
  }

  // ── Glitch characters ────────────────────────────────────────────────────

  _spawnGlitchChars(p) {
    if (!this._glitch || !this._stage) return
    const mob    = IS_MOB()
    const count  = mob ? 4 + Math.floor(Math.random() * 4)
                       : 8 + Math.floor(Math.random() * 8)

    const stageH = this._stage.offsetHeight
    const stageW = this._stage.offsetWidth
    const scanPx = p * stageH          // px from bottom (reveal edge)
    const bandPx = stageH * 0.15       // 15% band above the scan line

    for (let i = 0; i < count; i++) {
      const char = CHARS[Math.floor(Math.random() * CHARS.length)]
      const el   = document.createElement('span')
      const bot  = scanPx + Math.random() * bandPx

      el.textContent = char
      Object.assign(el.style, {
        position:     'absolute',
        left:         `${(Math.random() * Math.max(stageW - 12, 0)).toFixed(0)}px`,
        bottom:       `${bot.toFixed(0)}px`,
        fontFamily:   '"JetBrains Mono", monospace',
        fontSize:     `${10 + Math.floor(Math.random() * 4)}px`,
        color:        Math.random() > 0.5 ? '#FFD230' : '#E8E8E8',
        opacity:      '1',
        pointerEvents:'none',
        lineHeight:   '1',
        transition:   'opacity 250ms ease-out',
        willChange:   'opacity',
      })

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
    if (this._gatePassed)                          return
    if (!this._revealDone || !this._assetsLoaded)  return
    this._gatePassed = true

    await document.fonts.ready

    const elapsed = performance.now() - this._startTime
    if (elapsed < 800) {
      await new Promise(r => setTimeout(r, 800 - elapsed))
    }

    // Brief hold so the fully-revealed portrait registers
    await new Promise(r => setTimeout(r, 220))

    await this._exit()
    this._el.remove()
    this._onComplete()
  }

  // ── Exit transition ───────────────────────────────────────────────────────

  _exit() {
    return new Promise(resolve => {
      // HUD fades faster
      const hudTop = this._el.querySelector('.preloader-hud-top')
      const hudBot = this._el.querySelector('.preloader-hud-bottom')
      hudTop.style.transition = 'opacity 0.3s ease'
      hudBot.style.transition = 'opacity 0.3s ease'
      hudTop.style.opacity    = '0'
      hudBot.style.opacity    = '0'

      // Gold flash on the portrait
      this._stage.classList.add('preloader-stage--flash')
      setTimeout(() => this._stage?.classList.remove('preloader-stage--flash'), 420)

      // Whole overlay: fade + slight zoom
      setTimeout(() => {
        this._el.style.transition = 'opacity 0.8s ease, transform 0.8s ease'
        this._el.style.opacity    = '0'
        this._el.style.transform  = 'scale(1.05)'
        setTimeout(resolve, 820)
      }, 60)
    })
  }

  // ── Reduced-motion path ──────────────────────────────────────────────────

  _reducedMotionReveal() {
    this._mask.style.display  = 'none'
    this._scan.style.display  = 'none'
    this._glitch.style.display = 'none'

    this._image.style.opacity    = '0'
    this._image.style.transition = 'opacity 600ms ease'
    requestAnimationFrame(() => { this._image.style.opacity = '1' })

    setTimeout(() => {
      this._revealDone = true
      this._checkGate()
    }, 700)
  }
}
