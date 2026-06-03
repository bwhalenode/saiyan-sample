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

function playRandomTrack() {
  audio.src = tracks[Math.floor(Math.random() * tracks.length)]
  audio.play()
    .then(() => {
      isPlaying = true
      toggle.textContent = '♫ SOUND: ON'
    })
    .catch(() => {
      toggle.textContent = '♫ ENABLE SOUND'
    })
}

toggle.addEventListener('click', () => {
  if (!audio.src) {
    playRandomTrack()
    return
  }

  if (isPlaying) {
    audio.pause()
    isPlaying = false
    toggle.textContent = '♫ SOUND: OFF'
    return
  }

  audio.play()
    .then(() => {
      isPlaying = true
      toggle.textContent = '♫ SOUND: ON'
    })
    .catch(() => {
      toggle.textContent = '♫ ENABLE SOUND'
    })
})

audio.addEventListener('ended', playRandomTrack)
