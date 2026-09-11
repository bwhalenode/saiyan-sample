/* Mood to Motivation — standalone local demo (vanilla, no build step). */
(function () {
  'use strict'

  var forge = document.querySelector('[data-forge]')
  if (!forge) return

  var input = forge.querySelector('.forge__input')
  var generateBtn = forge.querySelector('[data-generate]')
  var againBtn = forge.querySelector('[data-again]')
  var loadingText = forge.querySelector('[data-loading-text]')
  var video = forge.querySelector('[data-video]')
  var soundBtn = forge.querySelector('[data-sound]')
  var captionEl = forge.querySelector('[data-caption]')

  // Drop your generated clip here:  mood-sample/assets/motivation.mp4
  var VIDEO_SRC = 'assets/motivation.mp4'

  // How long the charge-up plays before the reveal (adjustable).
  var LOADING_MS = 4000

  var LOADING_LINES = [
    'READING YOUR ENERGY…',
    'CHANNELLING THE KI…',
    'FORGING YOUR RESPONSE…',
    'POWERING UP…',
  ]

  // A few original motivational captions, picked at random on reveal.
  var CAPTIONS = [
    'Pain is fuel. Rise, ascend, and prove them wrong.',
    'Every fall is a setup for a stronger comeback.',
    'The fire you feel is your power waking up.',
    'Down today, unstoppable tomorrow. Channel the Ki.',
  ]

  var loadingTimer = null
  var revealTimer = null

  function setState(state) {
    forge.dataset.state = state
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function startLoading() {
    setState('loading')
    var i = 0
    loadingText.textContent = LOADING_LINES[0]
    loadingTimer = setInterval(function () {
      i = (i + 1) % LOADING_LINES.length
      loadingText.textContent = LOADING_LINES[i]
    }, Math.max(700, Math.floor(LOADING_MS / LOADING_LINES.length)))

    revealTimer = setTimeout(reveal, LOADING_MS)
  }

  function reveal() {
    clearInterval(loadingTimer)
    captionEl.textContent = pick(CAPTIONS)
    setState('reveal')
    loadVideo()
  }

  function setSound(muted) {
    video.muted = muted
    soundBtn.classList.toggle('is-muted', muted)
    soundBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
  }

  function loadVideo() {
    forge.classList.remove('has-video')
    soundBtn.hidden = true

    // (Re)attach the source so a retry re-checks the file.
    video.setAttribute('src', VIDEO_SRC)

    video.onloadeddata = function () {
      forge.classList.add('has-video')
      // Try to play WITH sound (the GENERATE click is the user gesture).
      video.muted = false
      var p = video.play()
      if (p && typeof p.then === 'function') {
        p.then(function () {
          setSound(false)            // sound on
          soundBtn.hidden = false
        }).catch(function () {
          // Browser blocked autoplay-with-sound -> start muted, offer the toggle.
          setSound(true)
          video.play().catch(function () {})
          soundBtn.hidden = false
        })
      } else {
        setSound(false)
        soundBtn.hidden = false
      }
    }

    // File missing / unsupported -> show the "drop your file here" placeholder.
    video.onerror = function () {
      forge.classList.remove('has-video')
      soundBtn.hidden = true
    }

    video.load()
  }

  function reset() {
    clearInterval(loadingTimer)
    clearTimeout(revealTimer)
    try { video.pause() } catch (e) {}
    forge.classList.remove('has-video')
    setState('input')
    input.focus()
  }

  generateBtn.addEventListener('click', function () {
    var mood = input.value.trim()
    if (!mood) { input.focus(); return }
    startLoading()
  })

  // Ctrl/Cmd + Enter also generates.
  input.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') generateBtn.click()
  })

  againBtn.addEventListener('click', reset)

  soundBtn.addEventListener('click', function () {
    var nextMuted = !video.muted
    setSound(nextMuted)
    if (!nextMuted) video.play().catch(function () {})
  })

  /* ── Site chrome: CA circle + anthem/music circle ── */
  var ca = document.querySelector('[data-ca]')
  if (ca) {
    var caTrigger = ca.querySelector('[data-ca-trigger]')
    var caCopy = ca.querySelector('[data-ca-copy]')
    var caAddr = ca.querySelector('[data-ca-addr]')
    caTrigger.addEventListener('click', function () { ca.classList.toggle('is-open') })
    caCopy.addEventListener('click', function () {
      navigator.clipboard && navigator.clipboard.writeText(caAddr.textContent.trim()).then(function () {
        caCopy.textContent = 'COPIED'
        setTimeout(function () { caCopy.textContent = 'COPY' }, 1400)
      })
    })
  }

  var anthem = document.querySelector('[data-anthem]')
  if (anthem) {
    var anthemBtn = anthem.querySelector('[data-anthem-btn]')
    var anthemName = anthem.querySelector('[data-anthem-name]')
    anthemBtn.addEventListener('click', function () {
      var on = anthem.dataset.on === 'true'
      anthem.dataset.on = String(!on)
      anthemName.textContent = on ? 'TAP FOR SOUND' : 'TAP TO MUTE'
      // re-trigger the brief label hint
      anthemName.style.animation = 'none'
      void anthemName.offsetWidth
      anthemName.style.animation = ''
    })
  }
})()
