/* SAIYAN audio, a single shared <audio> element so the hero anthem button and
   the soundtrack list act as remotes for the SAME playback. Nothing ever plays
   over anything else, and every surface stays in sync via subscribe(). */
let audio = null
let playlist = []            // ordered absolute srcs, used for auto-advance
const subs = new Set()

const abs = src => new URL(src, location.origin).href
const emit = () => subs.forEach(fn => fn())

function playSrc(src) {
  const a = ensure()
  const next = abs(src)
  if (a.src !== next) a.src = next
  try { a.currentTime = 0 } catch {}
  return a.play()
}

function nextTrackSrc() {
  if (!playlist.length || !audio?.src) return null
  const i = playlist.indexOf(audio.src)
  return playlist[(i + 1) % playlist.length]
}

/* Where the soundtrack had got to, remembered per tab so a real page load
   (a shared /gallery.html link, say) can pick the same track up at the same
   spot rather than starting over. sessionStorage, not localStorage: this is
   about one continuous visit, not about following someone between sessions. */
const MEMORY_KEY = 'saiyan:audio'

function remember() {
  if (!audio?.src) return
  try {
    sessionStorage.setItem(MEMORY_KEY, JSON.stringify({
      src: audio.src,
      time: audio.currentTime,
      muted: audio.muted,
    }))
  } catch { /* private mode, or storage full — playback still works */ }
}

function recall() {
  try {
    const raw = sessionStorage.getItem(MEMORY_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function ensure() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'none'     // only fetch a track once it's actually played
  audio.volume = 0.7
  audio.addEventListener('play', emit)
  audio.addEventListener('pause', emit)
  audio.addEventListener('timeupdate', emit)
  audio.addEventListener('timeupdate', remember)
  audio.addEventListener('ended', () => {
    const next = nextTrackSrc()
    if (next) playSrc(next).catch(() => emit())
    emit()
  })
  window.addEventListener('pagehide', () => { remember(); audio.pause() }, { once: true })
  return audio
}

export const audioPlayer = {
  /* Register the ordered tracklist so finished songs auto-advance. */
  setPlaylist(srcs) { playlist = srcs.map(abs) },

  /* Seed a fallback playlist only if the soundtrack list hasn't set one. */
  setPlaylistIfEmpty(srcs) { if (!playlist.length) playlist = srcs.map(abs) },

  /* fn() runs on every play / pause / seek / time tick. Returns an unsubscribe. */
  subscribe(fn) { subs.add(fn); return () => subs.delete(fn) },

  get playing()     { return !!audio && !audio.paused },
  get muted()       { return !!audio && audio.muted },
  get hasTrack()    { return !!audio && !!audio.src },
  get currentTime() { return audio?.currentTime || 0 },
  get duration()    { return audio?.duration || 0 },

  isCurrent(src) { return !!audio && audio.src === abs(src) },
  isPlaying(src) { return this.isCurrent(src) && this.playing },

  play(src) {
    playSrc(src).catch(() => emit())
  },

  /* Continue this tab's soundtrack, or start `fallbackSrc` if there is nothing
     to continue. MUST be called inside a user gesture (a tap, a click) — that
     is the whole reason the site gates the anthem behind TAP TO AWAKEN. */
  resumeWhereItLeftOff(fallbackSrc) {
    const saved = recall()
    const a = ensure()
    if (!saved?.src) return this.play(fallbackSrc)

    if (a.src !== saved.src) a.src = saved.src
    a.muted = !!saved.muted
    const seek = () => {
      try { a.currentTime = saved.time || 0 } catch { /* not seekable yet */ }
    }
    if (a.readyState > 0) seek()
    else a.addEventListener('loadedmetadata', seek, { once: true })
    a.play().catch(() => emit())
    emit()
  },

  playMuted(src) {
    const a = ensure()
    if (a.src !== abs(src)) a.src = src
    a.muted = true
    a.play().catch(() => emit())
    emit()
  },

  pause() { audio?.pause() },

  resume() { audio?.play().catch(() => emit()) },

  unmute() {
    const a = ensure()
    a.muted = false
    emit()
  },

  mute() {
    const a = ensure()
    a.muted = true
    emit()
  },

  toggle(src) {
    const a = ensure()
    if (this.isCurrent(src)) (a.paused ? a.play().catch(() => {}) : a.pause())
    else this.play(src)
  },

  seekFraction(f) {
    if (audio?.duration) audio.currentTime = Math.min(1, Math.max(0, f)) * audio.duration
  },
}
