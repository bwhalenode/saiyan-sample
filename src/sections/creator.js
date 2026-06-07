import './creator.css'

const root = document.querySelector('[data-creator]')

if (root) {
  const canvas = root.querySelector('.creator__canvas')
  const ctx = canvas.getContext('2d')
  const modeButtons = [...root.querySelectorAll('.creator__mode-btn')]
  const upload = root.querySelector('.creator__upload')
  const camera = root.querySelector('.creator__camera')
  const uploadTrigger = root.querySelector('[data-upload-trigger]')
  const uploadMenu = root.querySelector('[data-upload-menu]')
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches
  const templateSelect = root.querySelector('.creator__template')
  const imageZoom = root.querySelector('.creator__zoom')
  const imageOffsetX = root.querySelector('.creator__offset-x')
  const imageOffsetY = root.querySelector('.creator__offset-y')
  const pfpText = root.querySelector('.creator__pfp-text')
  const topText = root.querySelector('.creator__top-text')
  const bottomText = root.querySelector('.creator__bottom-text')
  const memeSize = root.querySelector('.creator__meme-size')
  const memeStyle = root.querySelector('.creator__meme-style')
  const frameToggle = root.querySelector('.creator__frame-toggle')
  const vignetteToggle = root.querySelector('.creator__vignette-toggle')
  const lightningToggle = root.querySelector('.creator__lightning-toggle')
  const download = root.querySelector('.creator__download')
  const pfpControls = [...root.querySelectorAll('[data-pfp-control]')]
  const memeControls = [...root.querySelectorAll('[data-meme-control]')]

  const state = {
    mode: 'pfp',
    userImage: null,
    templateImage: null,
    watermark: null,
    uploadUrl: null,
    pinchDistance: 0,
    pinchZoom: 1,
    dragStartX: 0,
    dragStartY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
  }

  const watermark = new Image()
  watermark.onload = () => {
    state.watermark = watermark
    render()
  }
  watermark.src = '/images/logo.png'

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  }

  function setMode(mode) {
    state.mode = mode
    modeButtons.forEach((button) => {
      const active = button.dataset.mode === mode
      button.classList.toggle('is-active', active)
      button.setAttribute('aria-selected', String(active))
    })
    pfpControls.forEach((control) => { control.hidden = mode !== 'pfp' })
    memeControls.forEach((control) => { control.hidden = mode !== 'meme' })
    render()
  }

  function coverImage(image, x, y, width, height, transform = {}) {
    const zoom = Number(transform.zoom ?? imageZoom.value)
    const offsetX = Number(transform.offsetX ?? imageOffsetX.value)
    const offsetY = Number(transform.offsetY ?? imageOffsetY.value)
    const scale = Math.max(width / image.width, height / image.height) * zoom
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    const drawX = x + (width - drawWidth) / 2 + offsetX
    const drawY = y + (height - drawHeight) / 2 + offsetY
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  }

  function drawFallbackBackground() {
    const gradient = ctx.createRadialGradient(512, 420, 40, 512, 512, 720)
    gradient.addColorStop(0, '#2a2110')
    gradient.addColorStop(0.28, '#080508')
    gradient.addColorStop(0.72, '#071525')
    gradient.addColorStop(1, '#020104')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 1024)

    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.strokeStyle = '#ffd230'
    for (let i = 0; i < 1024; i += 64) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i - 260, 1024)
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawVignette() {
    const gradient = ctx.createRadialGradient(512, 420, 120, 512, 512, 720)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(0.58, 'rgba(0,0,0,0.22)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.78)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1024, 1024)
  }

  function drawAuraFrame() {
    ctx.save()
    ctx.translate(512, 512)
    const ring = ctx.createLinearGradient(-400, -400, 400, 400)
    ring.addColorStop(0, '#fff7dc')
    ring.addColorStop(0.3, '#ffd230')
    ring.addColorStop(0.62, '#4ad8ff')
    ring.addColorStop(1, '#ffb000')

    ctx.shadowColor = 'rgba(255, 210, 48, 0.55)'
    ctx.shadowBlur = 34
    ctx.strokeStyle = ring
    ctx.lineWidth = 24
    ctx.beginPath()
    ctx.arc(0, 0, 456, 0, Math.PI * 2)
    ctx.stroke()

    ctx.shadowColor = 'rgba(74, 216, 255, 0.38)'
    ctx.shadowBlur = 22
    ctx.lineWidth = 5
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.arc(0, 0, 424, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  function drawLightning() {
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const bolts = [
      [[210, 270], [250, 308], [226, 348], [290, 392], [260, 450]],
      [[820, 252], [760, 310], [790, 366], [718, 420], [760, 498]],
      [[704, 760], [642, 724], [676, 682], [604, 626]],
    ]
    bolts.forEach((points) => {
      ctx.shadowColor = 'rgba(74, 216, 255, 0.76)'
      ctx.shadowBlur = 18
      ctx.strokeStyle = 'rgba(143, 229, 255, 0.88)'
      ctx.lineWidth = 7
      ctx.beginPath()
      points.forEach(([x, y], index) => {
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.shadowBlur = 0
      ctx.strokeStyle = 'rgba(255,255,255,0.78)'
      ctx.lineWidth = 2
      ctx.stroke()
    })
    ctx.restore()
  }

  function drawWatermark() {
    if (!state.watermark) return

    const size = state.mode === 'pfp' ? 136 : 128
    const x = state.mode === 'pfp' ? 710 : 862
    const y = state.mode === 'pfp' ? 710 : 862

    ctx.save()
    ctx.shadowColor = 'rgba(255, 210, 48, 0.45)'
    ctx.shadowBlur = 24
    ctx.drawImage(state.watermark, x, y, size, size)
    ctx.restore()
  }

  function drawPfpText() {
    const text = pfpText.value.trim()
    if (!text) return

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 52px Arial, sans-serif'
    ctx.lineWidth = 10
    ctx.strokeStyle = 'rgba(0,0,0,0.74)'
    ctx.fillStyle = '#ffd230'
    ctx.shadowColor = 'rgba(255, 210, 48, 0.34)'
    ctx.shadowBlur = 18
    ctx.strokeText(text.toUpperCase(), 512, 900)
    ctx.fillText(text.toUpperCase(), 512, 900)
    ctx.restore()
  }

  function drawPfp() {
    ctx.clearRect(0, 0, 1024, 1024)
    ctx.fillStyle = '#020104'
    ctx.fillRect(0, 0, 1024, 1024)

    ctx.save()
    ctx.beginPath()
    ctx.arc(512, 512, 448, 0, Math.PI * 2)
    ctx.clip()

    if (state.userImage) coverImage(state.userImage, 0, 0, 1024, 1024)
    else drawFallbackBackground()

    if (vignetteToggle.checked) drawVignette()
    if (lightningToggle.checked) drawLightning()
    ctx.restore()

    if (frameToggle.checked) drawAuraFrame()
    drawWatermark()
    drawPfpText()
  }

  function wrapText(text, maxWidth) {
    const words = text.toUpperCase().split(/\s+/).filter(Boolean)
    const lines = []
    let line = ''

    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width <= maxWidth || !line) {
        line = test
      } else {
        lines.push(line)
        line = word
      }
    })

    if (line) lines.push(line)
    return lines.slice(0, 3)
  }

  function drawMemeText(text, y, direction) {
    if (!text.trim()) return

    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = direction === 'top' ? 'top' : 'bottom'
    ctx.font = `900 ${memeSize.value}px Arial Black, Impact, sans-serif`
    ctx.lineWidth = 12
    ctx.strokeStyle = 'rgba(0,0,0,0.84)'
    ctx.fillStyle = memeStyle.value === 'blue'
      ? '#9de9ff'
      : memeStyle.value === 'gold'
        ? '#ffd230'
        : '#fff7dc'
    ctx.shadowColor = memeStyle.value === 'blue'
      ? 'rgba(74, 216, 255, 0.46)'
      : 'rgba(255, 210, 48, 0.36)'
    ctx.shadowBlur = 20

    const lines = wrapText(text, 880)
    const lineHeight = Number(memeSize.value) * 1.14
    const total = (lines.length - 1) * lineHeight

    lines.forEach((line, index) => {
      const lineY = direction === 'top'
        ? y + index * lineHeight
        : y - total + index * lineHeight
      ctx.strokeText(line, 512, lineY)
      ctx.fillText(line, 512, lineY)
    })

    ctx.restore()
  }

  function drawMeme() {
    ctx.clearRect(0, 0, 1024, 1024)
    if (state.userImage) coverImage(state.userImage, 0, 0, 1024, 1024)
    else if (state.templateImage) coverImage(state.templateImage, 0, 0, 1024, 1024)
    else drawFallbackBackground()

    drawVignette()
    if (lightningToggle.checked) drawLightning()
    drawMemeText(topText.value || 'WHEN THE KI HITS', 72, 'top')
    drawMemeText(bottomText.value || 'POWER LEVEL RISING', 948, 'bottom')
    drawWatermark()
  }

  function render() {
    if (state.mode === 'pfp') drawPfp()
    else drawMeme()
  }

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => setMode(button.dataset.mode))
  })

  async function handleFile(input) {
    const [file] = input.files
    if (!file) return

    if (state.uploadUrl) URL.revokeObjectURL(state.uploadUrl)
    state.uploadUrl = URL.createObjectURL(file)
    state.userImage = await loadImage(state.uploadUrl)
    render()
  }

  upload.addEventListener('change', () => handleFile(upload))
  camera.addEventListener('change', () => handleFile(camera))

  const closeUploadMenu = () => {
    uploadMenu.hidden = true
    uploadTrigger.setAttribute('aria-expanded', 'false')
  }

  uploadTrigger.addEventListener('click', () => {
    // Desktop has no camera to choose, so go straight to the file picker.
    if (!coarsePointer) { upload.click(); return }
    const open = uploadMenu.hidden
    uploadMenu.hidden = !open
    uploadTrigger.setAttribute('aria-expanded', String(open))
  })

  uploadMenu.querySelector('[data-pick="camera"]').addEventListener('click', () => { closeUploadMenu(); camera.click() })
  uploadMenu.querySelector('[data-pick="gallery"]').addEventListener('click', () => { closeUploadMenu(); upload.click() })
  document.addEventListener('click', e => {
    if (!e.target.closest('.creator__upload-control')) closeUploadMenu()
  })

  function touchDistance(touches) {
    const [first, second] = touches
    return Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    )
  }

  function setOffset(input, value) {
    const min = Number(input.min)
    const max = Number(input.max)
    input.value = String(Math.min(max, Math.max(min, value)))
  }

  canvas.addEventListener('touchstart', (event) => {
    if (event.touches.length === 1) {
      const [touch] = event.touches
      state.dragStartX = touch.clientX
      state.dragStartY = touch.clientY
      state.dragOffsetX = Number(imageOffsetX.value)
      state.dragOffsetY = Number(imageOffsetY.value)
      return
    }

    if (event.touches.length !== 2) return

    state.pinchDistance = touchDistance(event.touches)
    state.pinchZoom = Number(imageZoom.value)
  }, { passive: true })

  canvas.addEventListener('touchmove', (event) => {
    if (event.touches.length === 1) {
      event.preventDefault()
      const [touch] = event.touches
      const rect = canvas.getBoundingClientRect()
      const scale = canvas.width / rect.width
      const deltaX = (touch.clientX - state.dragStartX) * scale
      const deltaY = (touch.clientY - state.dragStartY) * scale

      setOffset(imageOffsetX, state.dragOffsetX + deltaX)
      setOffset(imageOffsetY, state.dragOffsetY + deltaY)
      render()
      return
    }

    if (event.touches.length !== 2 || !state.pinchDistance) return

    event.preventDefault()
    const nextDistance = touchDistance(event.touches)
    const ratio = nextDistance / state.pinchDistance
    const min = Number(imageZoom.min)
    const max = Number(imageZoom.max)
    const nextZoom = Math.min(max, Math.max(min, state.pinchZoom * ratio))

    imageZoom.value = String(nextZoom)
    render()
  }, { passive: false })

  canvas.addEventListener('touchend', () => {
    state.pinchDistance = 0
    state.pinchZoom = Number(imageZoom.value)
    state.dragOffsetX = Number(imageOffsetX.value)
    state.dragOffsetY = Number(imageOffsetY.value)
  })

  templateSelect.addEventListener('change', async () => {
    state.templateImage = await loadImage(templateSelect.value)
    render()
  })

  ;[
    pfpText,
    topText,
    bottomText,
    imageZoom,
    imageOffsetX,
    imageOffsetY,
    memeSize,
    memeStyle,
    frameToggle,
    vignetteToggle,
    lightningToggle,
  ].forEach((control) => {
    control.addEventListener('input', render)
    control.addEventListener('change', render)
  })

  download.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = state.mode === 'pfp' ? 'saiyan-pfp.png' : 'saiyan-meme.png'
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  })

  loadImage(templateSelect.value)
    .then((image) => {
      state.templateImage = image
      render()
    })
    .catch(render)

  render()
}
