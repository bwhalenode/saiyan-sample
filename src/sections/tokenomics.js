export function initTokenomics() {
  // Expose the static cards to AT as focusable buttons (scroll/hover FX live in CSS + timeline.js).
  document.querySelectorAll('.token-card').forEach(card => {
    if (card.tagName === 'A') return
    card.setAttribute('tabindex', '0')
    card.setAttribute('role', 'button')
    card.setAttribute('aria-label', `${card.textContent.trim().replace(/\s+/g, ' ')} energy orb`)
  })

  initOrbPress()
  initMarketPulse()
}

const TOKEN_ADDRESS = '0x1f7566299f6111a0d492f473bdbe4a1ebd9cef56'
const DEXSCREENER_TOKEN_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
const CHART_DELAY = 620

function initOrbPress() {
  document.querySelectorAll('.token-card').forEach(card => {
    const run = event => {
      if (card.classList.contains('is-bursting')) return

      const isChartLink = card.matches('a.token-card--market')
      if (isChartLink) event.preventDefault()

      card.classList.add('is-bursting')
      window.setTimeout(() => card.classList.remove('is-bursting'), CHART_DELAY)

      if (!isChartLink) return

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

  fetch(DEXSCREENER_TOKEN_URL, { headers: { Accept: 'application/json' } })
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
    .filter(pair => pair?.chainId === 'ethereum')
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
