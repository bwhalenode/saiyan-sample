/* /gallery.html — the Hall as a whole document, for direct links and sharing.
   Coming from the landing page you get the in-place view instead (see
   sections/hall-route.js), where nothing unloads and the music simply keeps
   playing. This file handles the other case: the page was genuinely loaded. */

import './style.css'
import { HallPreloader } from './gallery/HallPreloader.js'
import { mountHall } from './gallery/hall.js'
import { initCaBar } from './sections/ca-bar.js'
import { initHeroAnthem } from './sections/hero-anthem.js'
import { audioPlayer } from './sections/audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

mountHall(document.getElementById('hall'), { mode: 'page' })
initCaBar()
initHeroAnthem()

/* The landing page's preloader, subclassed for its wording and its exit. It
   also carries the tap that lets the soundtrack play, which a freshly loaded
   document cannot do on its own. */
new HallPreloader({
  onAwaken: () => audioPlayer.resumeWhereItLeftOff(ANTHEM_SRC),
  onComplete: () => {},
}).start()
