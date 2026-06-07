/* Hero sound toggle, a corner mute/unmute for the shared soundtrack queue.
   The queue auto-plays muted on load; this button only crosses (mute) or
   uncrosses (unmute) the speaker. Unmuting counts as the user gesture browsers
   require, and auto-advance through the playlist lives in the controller. */
import { audioPlayer } from './audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

export function initHeroAnthem() {
  const wrap = document.getElementById('hero-anthem-wrap')
  const btn  = document.getElementById('hero-anthem')
  if (!wrap || !btn) return

  const nameEl = wrap.querySelector('.hero__anthem-name')

  // If the soundtrack section isn't on this page, still loop at least the anthem.
  audioPlayer.setPlaylistIfEmpty?.([ANTHEM_SRC])

  // The name of whatever track is currently loaded (falls back to the anthem).
  const currentName = () => {
    const row = [...document.querySelectorAll('.music__track')]
      .find(r => audioPlayer.isCurrent(r.dataset.src))
    return row?.querySelector('.music__name')?.textContent || 'AWAKEN THE SAIYAN'
  }

  function render() {
    const on = audioPlayer.playing && !audioPlayer.muted   // sound audible
    wrap.classList.toggle('is-on', on)
    wrap.classList.toggle('is-muted', !on)
    btn.setAttribute('aria-pressed', String(on))
    btn.setAttribute('aria-label', on ? 'Mute the $SAIYAN soundtrack' : 'Unmute the $SAIYAN soundtrack')
    if (nameEl) nameEl.textContent = on ? currentName() : 'TAP FOR SOUND'
  }

  // Pure mute toggle: unmute (resuming/starting the queue if needed), or mute.
  btn.addEventListener('click', () => {
    if (audioPlayer.playing && !audioPlayer.muted) {
      audioPlayer.mute()
      return
    }
    if (!audioPlayer.playing) {
      audioPlayer.hasTrack ? audioPlayer.resume() : audioPlayer.play(ANTHEM_SRC)
    }
    audioPlayer.unmute()
  })

  audioPlayer.subscribe(render)
  render()
}

export function startHeroAnthemMuted() {
  audioPlayer.setPlaylistIfEmpty?.([ANTHEM_SRC])
  audioPlayer.playMuted(ANTHEM_SRC)
}
