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

/* Where the soundtrack had got to, per tab.

   ONLY the Hall page reads this, and only when it was reached by a real page
   load, so that walking in does not restart the track. The landing page never
   reads it: TAP TO AWAKEN calls play() and always begins at 0:00.

   Position only — never the mute state. The anthem button mutes rather than
   pauses, so carrying a mute across would silence the next entry. */
const MEMORY_KEY = 'saiyan:audio-position'

function remember() {
  if (!audio?.src) return
  try {
    sessionStorage.setItem(MEMORY_KEY, JSON.stringify({ src: audio.src, time: audio.currentTime }))
  } catch { /* private mode or storage full — playback is unaffected */ }
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

  /* Carry on from where this tab's soundtrack stopped, so arriving at the Hall
     through a page load does not restart the track. Falls back to playing
     `src` from the top when there is nothing to carry on from.

     Used by the Hall page alone. MUST be called inside a user gesture. */
  continueFrom(src) {
    let saved = null
    try {
      const raw = sessionStorage.getItem(MEMORY_KEY)
      saved = raw ? JSON.parse(raw) : null
    } catch { /* unreadable storage — start from the top */ }

    if (!saved?.src) return this.play(src)

    const a = ensure()
    a.muted = false            // entering is a request for sound
    if (a.src !== saved.src) a.src = saved.src
    const seek = () => {
      // Landing on the last moment of a track would look like nothing playing.
      const t = saved.time || 0
      try { a.currentTime = a.duration && t >= a.duration - 1.5 ? 0 : t } catch { /* not seekable yet */ }
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
