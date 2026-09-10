/* /gallery.html — the Hall as a whole document, for direct links and sharing.
   Coming from the landing page you get the in-place view instead (see
   sections/hall-route.js), where nothing unloads and the music simply keeps
   playing. This file handles the other case: the page was genuinely loaded. */

import './style.css'
import { AsciiPreloader } from './preloader/AsciiPreloader.js'
import { mountHall } from './gallery/hall.js'
import { initCaBar } from './sections/ca-bar.js'
import { initHeroAnthem } from './sections/hero-anthem.js'
import { audioPlayer } from './sections/audio-controller.js'

const ANTHEM_SRC = '/music/awaken-the-saiyan.mp3'

mountHall(document.getElementById('hall'), { mode: 'page' })
initCaBar()
initHeroAnthem()

/* The same preloader the landing page uses — same crystal, same reveal, same
   HUD — because a freshly loaded document may not play sound until the visitor
   acts, and this is what carries that tap. Two differences: the prompt reads
   ENTER THE HALL, and it leaves by rushing towards the viewer instead of the
   hero's transformation blast.

   It waits on no hero art: those images belong to the landing page and would
   be pure download here. */
new AsciiPreloader({
  promptText: 'ENTER THE HALL',
  exit: 'zoom',
  assets: [],
  onAwaken: () => audioPlayer.resumeWhereItLeftOff(ANTHEM_SRC),
  onComplete: () => {},
}).start()
