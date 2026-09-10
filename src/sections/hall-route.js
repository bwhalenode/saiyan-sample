/* Opens the Hall of Power in place instead of navigating to /gallery.html.

   Why: the soundtrack is a single <audio> element owned by this document. Any
   link to another page tears that document down and the music stops — and a
   fresh document cannot start it again on its own, because browsers require a
   user gesture before playing sound. Keeping the visitor in this document is
   the only way the music genuinely continues, and it keeps the CA and anthem
   circles on screen for free, since both are position: fixed.

   /gallery.html still exists and still works as a real page for direct links;
   this only intercepts in-site clicks. */

const HALL_PATH = '/gallery.html'

export function initHallRoute(lenis) {
  let view = null   // the mounted Hall, while open
  let host = null

  const isHallLink = (a) => a && new URL(a.href, location.origin).pathname === HALL_PATH

  async function open({ push = true } = {}) {
    if (view) return
    if (push && location.pathname !== HALL_PATH) history.pushState({ hall: true }, '', HALL_PATH)

    host = document.createElement('div')
    host.id = 'hall-view'
    document.body.appendChild(host)
    document.body.classList.add('hall-open')
    // The disclaimer strip stays above the Hall (it is a legal notice, and it
    // wraps to two lines on narrow screens) so measure it rather than guessing.
    const bar = document.querySelector('.disclaimer-bar')
    host.style.setProperty('--gal-top', `${bar ? Math.ceil(bar.getBoundingClientRect().height) : 0}px`)
    // Lenis drives the landing page's smooth scroll and swallows wheel/touch
    // globally; it has to stand down while the Hall owns the viewport.
    lenis?.stop()

    const { mountHall } = await import('../gallery/hall.js')
    // A second click while the chunk was loading may have closed it again.
    if (!host.isConnected) return
    view = mountHall(host, { mode: 'view', onClose: (hash) => close({ hash }) })
    view.focus()
  }

  function close({ hash = null, pop = false } = {}) {
    if (!view && !host) return
    view?.destroy()
    host?.remove()
    view = null
    host = null
    document.body.classList.remove('hall-open')
    lenis?.start()

    if (!pop) history.pushState({}, '', hash ? `/${hash}` : '/')
    if (hash) document.querySelector(hash)?.scrollIntoView()
  }

  document.addEventListener('click', (e) => {
    // Let modified clicks (new tab, download, middle-click) behave normally.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a')
    if (!isHallLink(a) || a.target === '_blank') return
    e.preventDefault()
    open()
  })

  window.addEventListener('popstate', () => {
    if (location.pathname === HALL_PATH) open({ push: false })
    else close({ pop: true })
  })

  // Landing here via history restore (back into a pushed Hall entry).
  if (location.pathname === HALL_PATH) open({ push: false })
}
