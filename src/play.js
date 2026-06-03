const tracks = [
  'https://games.heidrunbot.app/music/horns-over-midgard.mp3',
  'https://games.heidrunbot.app/music/horns-over-midgard-2.mp3',
  'https://games.heidrunbot.app/music/fury-of-the-fjord.mp3',
  'https://games.heidrunbot.app/music/fury-of-the-fjord-2.mp3',
  'https://games.heidrunbot.app/music/heidruns-horn.mp3',
]

const toggle = document.querySelector('.play-sound-toggle')
const audio = new Audio()
let isPlaying = false

audio.volume = 0.36

function setSoundState(playing) {
  isPlaying = playing
  toggle.classList.toggle('is-playing', playing)
  toggle.setAttribute('aria-pressed', String(playing))
  toggle.setAttribute('aria-label', playing ? 'Mute sound' : 'Enable sound')
}

function playRandomTrack() {
  audio.src = tracks[Math.floor(Math.random() * tracks.length)]
  audio.play()
    .then(() => setSoundState(true))
    .catch(() => setSoundState(false))
}

toggle.addEventListener('click', () => {
  if (!audio.src) {
    playRandomTrack()
    return
  }

  if (isPlaying) {
    audio.pause()
    setSoundState(false)
    return
  }

  audio.play()
    .then(() => setSoundState(true))
    .catch(() => setSoundState(false))
})

audio.addEventListener('ended', playRandomTrack)

window.addEventListener('message', (event) => {
  if (event.origin !== 'https://games.heidrunbot.app') return
  if (event.data !== 'closeGame') return

  window.location.href = 'https://games.heidrunbot.app/game?hub'
})
