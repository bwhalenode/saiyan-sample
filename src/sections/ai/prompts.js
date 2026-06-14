/* SAIYAN AI — prompt builders. Pure functions: mode + user input -> a structured
   prompt object ready for a future generation API. Kept free of any DOM/UI so the
   service layer (or a server) can call them directly. */

export const AURAS = {
  golden:   { id: 'golden',   label: 'Golden aura',        light: 'radiant gold' },
  emerald:  { id: 'emerald',  label: 'Emerald-blue aura',  light: 'emerald and deep blue' },
  electric: { id: 'electric', label: 'Electric-blue aura', light: 'electric cyan-blue' },
  dark:     { id: 'dark',     label: 'Dark warrior',       light: 'shadowed gold rim light' },
}

const auraLight = id => (AURAS[id] || AURAS.golden).light

/* MULTI-MOTIVATION (primary): a short emotional mood -> a cinematic Super Saiyan
   comeback video concept. Intense and motivational, never cringe. */
export function buildMotivationPrompt(mood, opts = {}) {
  const aura = opts.aura || 'golden'
  const text = (mood || '').trim()
  return {
    mode: 'motivation',
    output: 'video',
    format: { ratio: '9:16', duration: '6-10s', style: 'cinematic vertical short' },
    aura,
    tone: 'intense, cinematic, motivational, sincere — never cringe',
    emotionalArc: 'hits a low / falls -> spark of will -> power-up -> rises stronger -> ready to fight another day',
    subject: 'a lone Super Saiyan-style warrior (silhouetted, heroic)',
    userMood: text,
    prompt:
      `Cinematic 9:16 motivational short for someone who feels "${text}". ` +
      `Open on a lone warrior on their knees in the rubble, drained and beaten. ` +
      `A spark catches — a ${auraLight(aura)} aura ignites, lightning cracks, the ground trembles. ` +
      `They rise and power up, hair and energy surging, eyes burning with resolve, ready to fight another day. ` +
      `Dramatic comeback energy, high contrast, embers and light streaks. Turn this exact mood into fuel. ` +
      `No on-screen text unless requested; let the visuals carry the emotion.`,
    negative: 'cringe, cheesy stock motivation, low effort, watermarks, distorted anatomy',
  }
}

/* PFP: an uploaded person -> a Super Saiyan-inspired crypto warrior profile picture. */
export function buildPfpPrompt(opts = {}) {
  const aura = opts.aura || 'golden'
  return {
    mode: 'pfp',
    output: 'image',
    format: { ratio: '1:1', composition: 'centered head-and-shoulders profile picture' },
    aura,
    preserveIdentity: true,
    hasUpload: Boolean(opts.hasUpload),
    prompt:
      `Transform the uploaded person into a Super Saiyan-inspired crypto warrior PFP. ` +
      `Preserve their identity and facial likeness. Add a ${auraLight(aura)} energy aura, ` +
      `glowing eyes, dramatic rim light, high contrast dark/gold/blue palette, subtle lightning. ` +
      `Square 1:1, clean centered profile-picture composition, premium and battle-ready — not a full scene.`,
    negative: 'lose likeness, extra limbs, text, logos, messy background',
  }
}

/* MEME: a user idea -> a funny $SAIYAN / Super Saiyan / crypto meme concept. */
export function buildMemePrompt(idea, opts = {}) {
  const text = (idea || '').trim()
  return {
    mode: 'meme',
    output: 'image',
    format: { ratio: '1:1', style: 'bold, simple, shareable meme' },
    tone: 'funny, sharp, community-friendly, crypto-native',
    userIdea: text,
    prompt:
      `Create a funny $SAIYAN / Super Saiyan crypto meme based on: "${text}". ` +
      `Keep it sharp, simple and instantly readable — big bold caption, clean composition, ` +
      `Saiyan power-up energy with a crypto/degen punchline. Community-friendly humour, no NSFW.`,
    negative: 'cluttered, unreadable text, offensive content',
  }
}

export function buildPrompt(mode, input, opts) {
  if (mode === 'pfp') return buildPfpPrompt(opts)
  if (mode === 'meme') return buildMemePrompt(input, opts)
  return buildMotivationPrompt(input, opts)
}
