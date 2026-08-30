/* Buy modal: one BUY action opens a centred popup with Uniswap + Phantom routes.
   Uniswap has a real web swap (any wallet). Phantom opens in the Phantom app /
   extension; if Phantom isn't installed we point the user at the official site. */
const CA = '0xd242d6CC65eA378D3eD99FBf82Ef8784D9cF9ff6'
const UNISWAP_URL = `https://app.uniswap.org/swap?chain=robinhood&inputCurrency=NATIVE&outputCurrency=${CA}`
const PHANTOM_INSTALL = 'https://phantom.app/download'

const hasPhantom = () =>
  !!(window.phantom?.ethereum || window.phantom?.solana || window.solana?.isPhantom)

export function initBuy() {
  const modal = document.querySelector('[data-buy-modal]')
  if (!modal) return

  const closeBtn = modal.querySelector('[data-buy-close]')
  const uniswapLink = modal.querySelector('[data-buy-uniswap]')
  const phantomBtn = modal.querySelector('[data-buy-phantom]')
  const notice = modal.querySelector('[data-buy-notice]')
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches
  let lastFocused = null

  // Keep the rendered fallback and the interactive modal on the same token-specific route.
  if (uniswapLink) uniswapLink.href = UNISWAP_URL

  const open = () => {
    lastFocused = document.activeElement
    if (notice) notice.hidden = true
    modal.hidden = false
    closeBtn?.focus()
  }
  const close = () => {
    modal.hidden = true
    lastFocused?.focus?.()
  }

  document.querySelectorAll('[data-buy]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      event.preventDefault()   // the href stays as a no-JS fallback
      open()
    })
  })

  closeBtn?.addEventListener('click', close)
  modal.addEventListener('click', event => { if (event.target === modal) close() })
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close() })

  phantomBtn?.addEventListener('click', () => {
    if (coarsePointer) {
      // Mobile: open the swap inside Phantom's in-app browser. The universal link
      // opens the Phantom app if installed, or lands on phantom.app to install.
      window.open(
        `https://phantom.app/ul/browse/${encodeURIComponent(UNISWAP_URL)}?ref=${encodeURIComponent(location.origin)}`,
        '_blank',
        'noopener,noreferrer',
      )
      close()
      return
    }

    if (hasPhantom()) {
      // Desktop with the Phantom extension: open Uniswap, Phantom connects there.
      window.open(UNISWAP_URL, '_blank', 'noopener,noreferrer')
      close()
      return
    }

    // Desktop, Phantom not installed: surface the install prompt.
    if (notice) notice.hidden = false
    else window.open(PHANTOM_INSTALL, '_blank', 'noopener,noreferrer')
  })
}
