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
  initBurnTracker()
}

const TOKEN_ADDRESS = '0x1f7566299f6111a0d492f473bdbe4a1ebd9cef56'
const DEXSCREENER_TOKEN_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
const CHART_DELAY = 620

// CORS-friendly public RPCs (no API key); tried in order until one answers.
const RPC_ENDPOINTS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.drpc.org',
  'https://rpc.mevblocker.io',
  'https://eth.merkle.io',
]
// Burns on this token are sent to the dead/zero addresses (total supply is fixed),
// so "burned" = the balance held at those addresses.
const BURN_ADDRESSES = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
]
const SEL_DECIMALS = '0x313ce567'
const SEL_TOTAL_SUPPLY = '0x18160ddd'
const BURN_REFRESH_MS = 60_000

const balanceOfData = addr => '0x70a08231' + addr.replace(/^0x/, '').toLowerCase().padStart(64, '0')
const toBig = hex => (hex && hex !== '0x' ? BigInt(hex) : 0n)

async function rpcCallBatch(url, dataList) {
  const body = dataList.map((data, id) => ({
    jsonrpc: '2.0', id, method: 'eth_call',
    params: [{ to: TOKEN_ADDRESS, data }, 'latest'],
  }))
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`RPC ${res.status}`)
  const json = await res.json()
  if (!Array.isArray(json)) throw new Error('RPC batch unsupported')
  const byId = {}
  json.forEach(entry => { byId[entry.id] = entry.result })
  return byId
}

async function fetchBurnState() {
  const calls = [SEL_DECIMALS, SEL_TOTAL_SUPPLY, ...BURN_ADDRESSES.map(balanceOfData)]
  for (const url of RPC_ENDPOINTS) {
    try {
      const r = await rpcCallBatch(url, calls)
      const total = toBig(r[1])
      if (!total) continue
      const decimals = Number(toBig(r[0])) || 18
      const burned = BURN_ADDRESSES.reduce((sum, _, i) => sum + toBig(r[2 + i]), 0n)
      return { decimals, total, burned }
    } catch {
      /* try the next endpoint */
    }
  }
  throw new Error('all RPC endpoints failed')
}

function initBurnTracker() {
  const pctEl = document.querySelector('[data-burn-pct]')
  const availEl = document.querySelector('[data-burn-available]')
  if (!pctEl) return

  const render = ({ decimals, total, burned }) => {
    const unit = 10n ** BigInt(decimals)
    const pct = Number((burned * 10000n) / total) / 100        // 2-decimal %
    const available = Number((total - burned) / unit)
    pctEl.textContent = `${pct.toFixed(2)}%`
    if (availEl) availEl.textContent = `${available.toLocaleString('en-US')} LEFT`
  }

  const tick = () => fetchBurnState()
    .then(render)
    .catch(err => console.warn('[SAIYAN] Burn tracker unavailable:', err))

  tick()
  setInterval(tick, BURN_REFRESH_MS)
}

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
