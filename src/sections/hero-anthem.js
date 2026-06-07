/* Hero anthem toggle — a corner remote for the shared audio controller that
   fires up "Awaken The Saiyan" (track 01) to set the mood on the landing view.
   Audio is always user-initiated (a click), satisfying browser autoplay rules. */
import { audioPlayer } from './audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

export function initHeroAnthem() {
  const wrap = document.getElementById('hero-anthem-wrap')
  const btn  = document.getElementById('hero-anthem')
  if (!wrap || !btn) return

  // If the soundtrack section isn't on this page, still allow the anthem to play.
  audioPlayer.setPlaylistIfEmpty?.([ANTHEM_SRC])

  function render() {
    const playing = audioPlayer.isPlaying(ANTHEM_SRC)
    wrap.classList.toggle('is-playing', playing)
    btn.setAttribute('aria-pressed', String(playing))
    btn.setAttribute('aria-label', playing ? 'Pause the $SAIYAN anthem' : 'Play the $SAIYAN anthem')
  }

  btn.addEventListener('click', () => audioPlayer.toggle(ANTHEM_SRC))
  audioPlayer.subscribe(render)
  render()
}
