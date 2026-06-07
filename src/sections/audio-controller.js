/* SAIYAN audio — a single shared <audio> element so the hero anthem button and
   the soundtrack list act as remotes for the SAME playback. Nothing ever plays
   over anything else, and every surface stays in sync via subscribe(). */
let audio = null
let playlist = []            // ordered absolute srcs, used for auto-advance
const subs = new Set()

const abs = src => new URL(src, location.origin).href
const emit = () => subs.forEach(fn => fn())

function ensure() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'none'     // only fetch a track once it's actually played
  audio.volume = 0.7
  audio.addEventListener('play', emit)
  audio.addEventListener('pause', emit)
  audio.addEventListener('timeupdate', emit)
  audio.addEventListener('ended', () => {
    const i = playlist.indexOf(audio.src)
    const next = playlist.length ? playlist[(i + 1) % playlist.length] : null
    if (next) { audio.src = next; audio.play().catch(() => {}) }  // roll into the next anthem
    emit()
  })
  window.addEventListener('pagehide', () => audio.pause(), { once: true })
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
  get currentTime() { return audio?.currentTime || 0 },
  get duration()    { return audio?.duration || 0 },

  isCurrent(src) { return !!audio && audio.src === abs(src) },
  isPlaying(src) { return this.isCurrent(src) && this.playing },

  play(src) {
    const a = ensure()
    if (a.src !== abs(src)) a.src = src
    a.play().catch(() => emit())
  },

  pause() { audio?.pause() },

  toggle(src) {
    const a = ensure()
    if (this.isCurrent(src)) (a.paused ? a.play().catch(() => {}) : a.pause())
    else this.play(src)
  },

  seekFraction(f) {
    if (audio?.duration) audio.currentTime = Math.min(1, Math.max(0, f)) * audio.duration
  },
}
