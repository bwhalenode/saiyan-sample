/* Hero sound toggle, a corner mute/unmute for the shared soundtrack queue.
   The anthem starts playing out loud the moment the preloader is tapped (that
   tap is the user gesture browsers require). This button then mutes (crossed
   equalizer) or unmutes; auto-advance through the playlist lives in the controller. */
import { audioPlayer } from './audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

export function initHeroAnthem() {
  const wrap = document.getElementById('hero-anthem-wrap')
  const btn  = document.getElementById('hero-anthem')
  if (!wrap || !btn) return

  const nameEl = wrap.querySelector('.hero__anthem-name')

  // If the soundtrack section isn't on this page, still loop at least the anthem.
  audioPlayer.setPlaylistIfEmpty?.([ANTHEM_SRC])

  function render() {
    const on = audioPlayer.playing && !audioPlayer.muted   // sound audible
    wrap.classList.toggle('is-on', on)
    wrap.classList.toggle('is-muted', !on)
    btn.setAttribute('aria-pressed', String(on))
    btn.setAttribute('aria-label', on ? 'Mute the $SAIYAN soundtrack' : 'Unmute the $SAIYAN soundtrack')
    if (nameEl) nameEl.textContent = on ? 'TAP TO MUTE' : 'TAP FOR SOUND'
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

// Called from the preloader tap (a user gesture) so the track plays out loud.
export function startHeroAnthem() {
  audioPlayer.setPlaylistIfEmpty?.([ANTHEM_SRC])
  audioPlayer.play(ANTHEM_SRC)
}
