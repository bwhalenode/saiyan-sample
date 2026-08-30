export function initTokenomics() {
  // Expose the static cards to AT as focusable buttons (scroll/hover FX live in CSS + timeline.js).
  document.querySelectorAll('.token-card').forEach(card => {
    if (card.tagName === 'A') return
    card.setAttribute('tabindex', '0')
    card.setAttribute('role', 'button')
    card.setAttribute('aria-label', `${card.textContent.trim().replace(/\s+/g, ' ')} energy orb`)
  })

  initOrbPress()
  setBurnStatPending()
  initMarketPulse()
}

function setBurnStatPending() {
  document.querySelectorAll('[data-burn-pct]').forEach(el => { el.textContent = 'N/A' })
  const avail = document.querySelector('[data-burn-available]')
  if (avail) avail.textContent = 'VIEW EXPLORER'
}

const TOKEN_ADDRESS = '0xd242d6CC65eA378D3eD99FBf82Ef8784D9cF9ff6'
const DEXSCREENER_PAIR_ID = '0xdc9e3d0bf5bed81d536218063fd726f4d9b8cf03d93e767d043ca5ef58e2f4db'
const DEXSCREENER_PAIR_URL = `https://api.dexscreener.com/latest/dex/pairs/robinhood/${DEXSCREENER_PAIR_ID}`
const CHART_DELAY = 620

function initOrbPress() {
  document.querySelectorAll('.token-card').forEach(card => {
    const run = event => {
      if (card.classList.contains('is-bursting')) return

      const isTokenLink = card.matches('a.token-card')
      if (isTokenLink) event.preventDefault()

      card.classList.add('is-bursting')
      window.setTimeout(() => card.classList.remove('is-bursting'), CHART_DELAY)

      if (!isTokenLink) return

      const target = card.getAttribute('target')
      const href = card.getAttribute('href')
      window.setTimeout(() => {
        if (target === '_blank') {
          window.open(href, '_blank', 'noopener,noreferrer')
          return
        }
        window.location.href = href
      }, CHART_DELAY)
    }

    card.addEventListener('click', run)
    card.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      run(event)
    })
  })
}

function initMarketPulse() {
  const root = document.querySelector('[data-token-market]')
  if (!root) return

  const status = document.querySelector('[data-market-status]')
  const price = root.querySelector('[data-market-price]')
  const marketCap = root.querySelector('[data-market-cap]')
  const volume = root.querySelector('[data-market-volume]')
  const liquidity = root.querySelector('[data-market-liquidity]')

  const setStatus = (text, isError = false) => {
    if (!status) return
    status.textContent = text
    status.classList.toggle('is-error', isError)
  }

  fetch(DEXSCREENER_PAIR_URL, { headers: { Accept: 'application/json' } })
    .then(response => {
      if (!response.ok) throw new Error(`DexScreener ${response.status}`)
      return response.json()
    })
    .then(data => {
      const pair = pickBestPair(data?.pairs)
      if (!pair) throw new Error('No token pair returned')

      price.textContent = formatPrice(pair.priceUsd)
      marketCap.textContent = formatUsd(pair.marketCap || pair.fdv)
      volume.textContent = formatUsd(pair.volume?.h24)
      liquidity.textContent = formatUsd(pair.liquidity?.usd)
      setStatus('LIVE')
    })
    .catch(error => {
      console.warn('[SAIYAN] Market pulse unavailable:', error)
      setStatus('UNAVAILABLE', true)
    })
}

function pickBestPair(pairs = []) {
  return pairs
    .filter(pair => pair?.chainId === 'robinhood' && pair?.baseToken?.address?.toLowerCase() === TOKEN_ADDRESS.toLowerCase())
    .sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0))[0]
}

function formatUsd(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '—'

  if (number >= 1_000_000_000) return `$${trimNumber(number / 1_000_000_000)}B`
  if (number >= 1_000_000) return `$${trimNumber(number / 1_000_000)}M`
  if (number >= 1_000) return `$${trimNumber(number / 1_000)}K`
  return `$${number.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function formatPrice(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '—'

  if (number >= 1) {
    return `$${number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return `$${number.toLocaleString('en-US', {
    minimumSignificantDigits: 2,
    maximumSignificantDigits: 4,
  })}`
}

function trimNumber(number) {
  return number.toLocaleString('en-US', {
    minimumFractionDigits: number < 10 ? 2 : 1,
    maximumFractionDigits: number < 10 ? 2 : 1,
  })
}
