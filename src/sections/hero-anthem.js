/* Hero anthem toggle — a corner master control for the shared audio queue.
   Pressing it starts "Awaken The Saiyan" (track 01) and rolls through the whole
   $SAIYAN soundtrack on an endless loop (auto-advance lives in the controller).
   Audio is always user-initiated (a click), satisfying browser autoplay rules. */
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
    const playing = audioPlayer.playing            // lit for ANY track in the queue
    wrap.classList.toggle('is-playing', playing)
    btn.setAttribute('aria-pressed', String(playing))
    btn.setAttribute('aria-label', playing ? 'Pause the $SAIYAN soundtrack' : 'Play the $SAIYAN soundtrack')
    if (nameEl && audioPlayer.hasTrack) nameEl.textContent = currentName()
  }

  // Master play/pause for the queue: pause if anything's playing, resume the
  // current track if one is loaded, otherwise kick the loop off from the anthem.
  btn.addEventListener('click', () => {
    if (audioPlayer.playing) audioPlayer.pause()
    else if (audioPlayer.hasTrack) audioPlayer.resume()
    else audioPlayer.play(ANTHEM_SRC)
  })

  audioPlayer.subscribe(render)
  render()
}
