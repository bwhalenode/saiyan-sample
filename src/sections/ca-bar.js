/* Contract-address circle. Lives here rather than in hero.js so the Hall page
   can reuse it without pulling in GSAP and the hero reveal timeline. */

export const CA = '0xd242d6CC65eA378D3eD99FBf82Ef8784D9cF9ff6'

export function initCaBar() {
  const caWrap = document.getElementById('hero-ca-bar')
  const trigger = document.getElementById('ca-trigger')
  const panel = document.getElementById('ca-panel')
  const btn = document.getElementById('ca-copy')
  const addrEl = document.getElementById('ca-address')
  const label = btn?.querySelector('.hero__ca-copy-label')
  if (!caWrap) return

  if (addrEl) addrEl.textContent = CA

  trigger?.addEventListener('click', () => {
    const open = !caWrap.classList.contains('is-open')
    caWrap.classList.toggle('is-open', open)
    trigger.setAttribute('aria-expanded', String(open))
    panel?.setAttribute('aria-hidden', String(!open))
  })

  btn?.addEventListener('click', () => {
    navigator.clipboard.writeText(CA).then(() => {
      if (label) label.textContent = 'COPIED'
      setTimeout(() => {
        if (label) label.textContent = 'COPY'
      }, 1400)
    })
  })
}
