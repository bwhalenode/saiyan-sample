/* The Hall's preloader: the landing page's AsciiPreloader, subclassed.

   Same crystal, same reveal, same HUD, same prompt styling — inherited, not
   copied. Only two things differ, and both are overrides here so that
   preloader/AsciiPreloader.js stays exactly as the landing page needs it:

     - the prompt reads ENTER THE HALL
     - it exits by rushing the crystal at the viewer instead of the hero's
       transformation blast

   Nothing in this file runs on the landing page. */

import { AsciiPreloader } from '../preloader/AsciiPreloader.js'

const REDUCED = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export class HallPreloader extends AsciiPreloader {
  /* Let the base class arm the tap exactly as it does on the landing page,
     then relabel the prompt it just wrote. */
  _maybeShowPrompt() {
    const armedBefore = this._armed
    super._maybeShowPrompt()
    if (!armedBefore && this._armed) this._prompt.textContent = 'ENTER THE HALL'
  }

  /* _onTap() calls this._burst(), so overriding it is enough to change how the
     preloader leaves — no need to touch the tap handling itself.

     Nothing from the landing page's exit is reused: no flare, no shockwave, no
     flash, no shake, and no delay before anything happens. On the tap the image
     starts zooming and fading in the same frame, and the Hall is there when it
     has gone. */
  async _burst() {
    this._prompt.classList.remove('is-ready')

    if (REDUCED()) {
      this._el.style.transition = 'opacity 0.28s ease'
      this._el.style.opacity = '0'
      await wait(300)
      this._finish()
      return
    }

    this._stage.style.transition = 'transform 620ms cubic-bezier(0.33, 0, 0.2, 1)'
    this._stage.style.transform = 'scale(3.4)'
    // The whole overlay fades, taking the HUD and the prompt with it, starting
    // at the same instant as the zoom.
    this._el.style.transition = 'opacity 620ms cubic-bezier(0.4, 0, 1, 1)'
    this._el.style.opacity = '0'

    await wait(650)
    this._finish()
  }
}
