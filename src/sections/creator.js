import './creator.css'

/* AI creator teaser: a fake prompt box that types Saiyan prompts, "thinks",
   then clears and types the next one. Placeholder until the server-side AI
   image generation ships. */
const forge = document.querySelector('[data-forge]')
const typeEl = forge?.querySelector('[data-type]')

if (forge && typeEl) {
  const PROMPTS = [
    'turn my pfp into a golden $SAIYAN warrior',
    'ascended aura, blue lightning, glowing eyes',
    'make a $SAIYAN meme, diamond hands, max power',
    'battle-ready $SAIYAN, gold flames, cinematic',
    'my cat as a super $SAIYAN, ultra detailed',
    'epic $SAIYAN energy blast, hype, to the moon',
  ]

  // Blurred site assets stand in as "fake" generated outputs behind COMING SOON.
  const FAKES = [
    '/images/hero-1.webp',
    '/images/mid-page.webp',
    '/images/og-logo.jpg',
    '/images/logo.webp',
    '/images/team/team-meekro.jpg',
    '/images/team/team-atreyu.jpg',
  ]

  const preview = forge.querySelector('[data-preview]')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wait = ms => new Promise(r => setTimeout(r, ms))

  if (reduced) {
    typeEl.textContent = PROMPTS[0]
    if (preview) preview.style.backgroundImage = `url('${FAKES[0]}')`
  } else {
    ;(async function loop() {
      let i = 0
      while (true) {
        const prompt = PROMPTS[i]
        if (preview) preview.style.backgroundImage = `url('${FAKES[i % FAKES.length]}')`
        forge.dataset.state = 'typing'
        for (let c = 1; c <= prompt.length; c++) {
          typeEl.textContent = prompt.slice(0, c)
          await wait(45 + Math.random() * 55)
        }
        await wait(700)
        forge.dataset.state = 'thinking'   // "generating": COMING SOON flashes up
        await wait(1600)
        forge.dataset.state = 'typing'
        for (let c = prompt.length; c >= 0; c--) {
          typeEl.textContent = prompt.slice(0, c)
          await wait(22)
        }
        await wait(350)
        i = (i + 1) % PROMPTS.length
      }
    })()
  }
}
