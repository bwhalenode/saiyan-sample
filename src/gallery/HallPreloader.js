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
     preloader leaves — no need to touch the tap handling itself. */
  async _burst() {
    this._prompt.classList.remove('is-ready')
    this._prompt.style.transition = 'opacity 0.2s ease'
    this._prompt.style.opacity = '0'
    this._hudTop.style.transition = 'opacity 0.2s ease'
    this._hudTop.style.opacity = '0'
    this._hudBot.style.transition = 'opacity 0.2s ease'
    this._hudBot.style.opacity = '0'

    if (REDUCED()) {
      this._el.style.transition = 'opacity 0.3s ease'
      this._el.style.opacity = '0'
      await wait(320)
      this._finish()
      return
    }

    // A brief flare, then the rush towards the viewer.
    this._stage.classList.add('preloader-stage--flare')
    await wait(120)

    this._stage.style.transition = 'transform 760ms cubic-bezier(0.45, 0, 0.2, 1)'
    this._stage.style.transform = 'scale(4.2)'
    // Fade a little after the zoom starts, so it reads as coming at you rather
    // than simply dissolving.
    this._el.style.transition = 'opacity 620ms ease 180ms'
    this._el.style.opacity = '0'

    await wait(800)
    this._finish()
  }
}
