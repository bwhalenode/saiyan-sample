/* SAIYAN soundtrack — UI for the shared audio controller. The hero anthem
   button drives the same controller, so the two views stay in lockstep. */
import { audioPlayer } from './audio-controller.js'

export function initMusic() {
  const list = document.querySelector('[data-music]')
  if (!list) return

  const tracks = [...list.querySelectorAll('.music__track')]
  if (!tracks.length) return

  audioPlayer.setPlaylist(tracks.map(t => t.dataset.src))

  const fmt = s => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  function render() {
    tracks.forEach(track => {
      const src       = track.dataset.src
      const playing   = audioPlayer.isPlaying(src)
      const isCurrent = audioPlayer.isCurrent(src)

      track.classList.toggle('is-playing', playing)
      const name = track.querySelector('.music__name')?.textContent || ''
      track.querySelector('.music__toggle')
        ?.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${name}`)

      const fill = track.querySelector('.music__progress-fill')
      const time = track.querySelector('.music__time')
      if (isCurrent && audioPlayer.duration) {
        if (fill) fill.style.width = (audioPlayer.currentTime / audioPlayer.duration) * 100 + '%'
        if (time) time.textContent = fmt(audioPlayer.currentTime)
      } else {
        if (fill) fill.style.width = '0%'
        if (time) time.textContent = '0:00'
      }
    })
  }

  tracks.forEach(track => {
    track.querySelector('.music__toggle')
      ?.addEventListener('click', () => audioPlayer.toggle(track.dataset.src))

    const bar = track.querySelector('.music__progress')
    bar?.addEventListener('click', e => {
      if (!audioPlayer.isCurrent(track.dataset.src)) return
      const r = bar.getBoundingClientRect()
      audioPlayer.seekFraction((e.clientX - r.left) / r.width)
    })
  })

  audioPlayer.subscribe(render)
  render()
}
