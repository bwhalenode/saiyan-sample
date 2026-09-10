/* /gallery.html — the Hall as a whole document, for direct links and sharing.
   Coming from the landing page you get the in-place view instead (see
   sections/hall-route.js), where nothing unloads and the music simply keeps
   playing. This file handles the other case: the page was genuinely loaded. */

import './style.css'
import { mountHall } from './gallery/hall.js'
import { initHallGate } from './gallery/gate.js'
import { initCaBar } from './sections/ca-bar.js'
import { initHeroAnthem } from './sections/hero-anthem.js'
import { audioPlayer } from './sections/audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

mountHall(document.getElementById('hall'), { mode: 'page' })
initCaBar()
initHeroAnthem()

/* The gate exists to carry the tap that lets audio play — the same reason the
   landing page has TAP TO AWAKEN. It continues this tab's track from where it
   stopped, or starts the anthem if there is nothing to continue. */
initHallGate({
  onEnter: () => audioPlayer.resumeWhereItLeftOff(ANTHEM_SRC),
})
