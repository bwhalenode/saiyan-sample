/* /gallery.html — the Hall as a whole document, for direct links and sharing.
   Coming from the landing page you get the in-place view instead (see
   sections/hall-route.js), where nothing unloads and the music simply keeps
   playing. This file handles the other case: the page was genuinely loaded. */

import './style.css'
import { mountHall } from './gallery/hall.js'
import { initCaBar } from './sections/ca-bar.js'
import { initHeroAnthem } from './sections/hero-anthem.js'
import { audioPlayer } from './sections/audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

mountHall(document.getElementById('hall'), { mode: 'page' })
initCaBar()
initHeroAnthem()

/* Pick the soundtrack back up where it stopped.

   The landing page does not autoplay either — TAP TO AWAKEN is its gesture
   gate, and the anthem starts inside that tap. This is the same trick without
   a gate in the way: the first tap anywhere resumes the track at the position
   this tab left it, so walking into the Hall from the site feels continuous.

   Only when there is something to continue. A cold visitor arriving on a
   shared link gets silence until they choose the anthem circle — starting
   music at someone who never asked for it is not a good welcome. */
function resumeOnFirstGesture() {
  const off = () => {
    document.removeEventListener('pointerdown', start)
    document.removeEventListener('keydown', start)
  }
  function start() {
    off()
    audioPlayer.resumeWhereItLeftOff(ANTHEM_SRC)
  }
  document.addEventListener('pointerdown', start, { once: true })
  document.addEventListener('keydown', start, { once: true })
}

try {
  if (sessionStorage.getItem('saiyan:audio')) resumeOnFirstGesture()
} catch { /* storage unavailable: the anthem circle still works */ }
