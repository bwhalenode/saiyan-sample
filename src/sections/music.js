/* SAIYAN soundtrack — a lightweight one-at-a-time audio player. */
export function initMusic() {
  const list = document.querySelector('[data-music]')
  if (!list) return

  const tracks = [...list.querySelectorAll('.music__track')]
  if (!tracks.length) return

  const audio = new Audio()
  audio.preload = 'none'   // only fetch the mp3 once a track is actually played
  audio.volume = 0.7

  let current = null       // the <li> currently loaded/playing

  const fmt = s => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  function setPlaying(track, playing) {
    track.classList.toggle('is-playing', playing)
    const btn = track.querySelector('.music__toggle')
    const name = track.querySelector('.music__name')?.textContent || ''
    btn?.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${name}`)
  }

  function resetTrack(track) {
    setPlaying(track, false)
    const fill = track.querySelector('.music__progress-fill')
    const time = track.querySelector('.music__time')
    if (fill) fill.style.width = '0%'
    if (time) time.textContent = '0:00'
  }

  function play(track) {
    if (current && current !== track) resetTrack(current)
    current = track
    if (audio.src !== location.origin + track.dataset.src) audio.src = track.dataset.src
    audio.play().then(() => setPlaying(track, true)).catch(() => setPlaying(track, false))
  }

  tracks.forEach(track => {
    track.querySelector('.music__toggle')?.addEventListener('click', () => {
      const isCurrent = current === track
      if (isCurrent && !audio.paused) { audio.pause(); setPlaying(track, false); return }
      if (isCurrent && audio.src) { audio.play().then(() => setPlaying(track, true)).catch(() => {}); return }
      play(track)
    })

    const bar = track.querySelector('.music__progress')
    bar?.addEventListener('click', e => {
      if (current !== track || !audio.duration) return
      const r = bar.getBoundingClientRect()
      audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration
    })
  })

  audio.addEventListener('timeupdate', () => {
    if (!current || !audio.duration) return
    const fill = current.querySelector('.music__progress-fill')
    const time = current.querySelector('.music__time')
    if (fill) fill.style.width = (audio.currentTime / audio.duration) * 100 + '%'
    if (time) time.textContent = fmt(audio.currentTime)
  })

  audio.addEventListener('ended', () => {
    const idx = tracks.indexOf(current)
    resetTrack(current)
    const next = tracks[(idx + 1) % tracks.length]
    if (next) play(next)   // roll into the next anthem
  })

  window.addEventListener('pagehide', () => audio.pause(), { once: true })
}
