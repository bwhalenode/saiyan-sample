/* Entry gate for /gallery.html.

   The landing page starts its anthem inside the TAP TO AWAKEN tap, because a
   freshly loaded document may not play sound until the visitor acts. A loaded
   Hall page needs the same thing, so it gets its own gate — different wording,
   and a different exit: it zooms into the point that was tapped and fades,
   uncovering the Hall that has been sitting behind it the whole time.

   Only for the standalone page. Coming from the site the Hall opens in place
   with the music already playing, and no gate appears. */

import './gate.css'

const el = (tag, className, text) => {
  const n = document.createElement(tag)
  if (className) n.className = className
  if (text != null) n.textContent = text
  return n
}

/**
 * @param {object}     opts
 * @param {() => void} opts.onEnter runs inside the tap, so it may start audio
 * @returns {() => void} removes the gate early (if it is still up)
 */
export function initHallGate({ onEnter } = {}) {
  const gate = el('div', 'hall-gate')
  gate.setAttribute('role', 'button')
  gate.tabIndex = 0
  gate.setAttribute('aria-label', 'Enter the Hall of Power')

  const inner = el('div', 'hall-gate__inner')
  const logo = el('img', 'hall-gate__logo')
  logo.src = '/images/logo.png'
  logo.alt = ''
  inner.append(
    logo,
    el('p', 'hall-gate__eyebrow', 'POWER UNLEASHED'),
    el('h1', 'hall-gate__title', 'ENTER THE HALL'),
    el('p', 'hall-gate__prompt', 'TAP TO ENTER'),
    el('p', 'hall-gate__note', 'Sound on'),
  )
  gate.appendChild(inner)
  document.body.appendChild(gate)
  document.body.style.overflow = 'hidden'
  gate.focus()

  let left = false

  function leave(x, y) {
    if (left) return
    left = true
    // Zoom towards the tap itself, so the Hall opens out of the point touched.
    if (x != null && y != null) {
      gate.style.transformOrigin = `${(x / window.innerWidth) * 100}% ${(y / window.innerHeight) * 100}%`
    }
    gate.classList.add('is-leaving')
    document.body.style.overflow = ''
    // animationend can be missed if the tab is backgrounded mid-animation;
    // the timeout guarantees the gate is never left covering the page.
    const done = () => gate.remove()
    gate.addEventListener('animationend', done, { once: true })
    setTimeout(done, 900)
  }

  gate.addEventListener('click', (e) => {
    onEnter?.()          // inside the gesture, which is what unlocks audio
    leave(e.clientX, e.clientY)
  })
  gate.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Escape') return
    e.preventDefault()
    if (e.key !== 'Escape') onEnter?.()
    const r = gate.getBoundingClientRect()
    leave(r.width / 2, r.height / 2)
  })

  return () => leave()
}
