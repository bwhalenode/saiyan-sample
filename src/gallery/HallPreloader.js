/* Reuse the landing preloader with a Hall-specific prompt and zoom exit.
   This subclass is used only by the standalone gallery page. */

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

  // The inherited tap handler calls this override; zoom and fade start together.
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
