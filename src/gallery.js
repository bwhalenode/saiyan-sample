/* /gallery.html — the Hall as a whole document, for direct links and sharing.
   Coming from the landing page you get the in-place view instead (see
   sections/hall-route.js), which keeps the soundtrack playing. Here the page
   was loaded fresh, so the anthem starts paused until the visitor taps it —
   browsers do not allow sound without a gesture in a newly loaded document. */

import './style.css'
import { mountHall } from './gallery/hall.js'
import { initCaBar } from './sections/ca-bar.js'
import { initHeroAnthem } from './sections/hero-anthem.js'

mountHall(document.getElementById('hall'), { mode: 'page' })
initCaBar()
initHeroAnthem()
