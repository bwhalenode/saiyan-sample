import * as THREE from 'three'

// WebP feature detection — resolved before any texture loads
const supportsWebP = await new Promise(resolve => {
  const img = new Image()
  img.onload  = () => resolve(img.width === 1)
  img.onerror = () => resolve(false)
  img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJZQCdAEO/gHOAAA='
})
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js'

import auraVert   from './shaders/aura.vert?raw'
import auraFrag   from './shaders/aura.frag?raw'
import crystalVert from './shaders/crystal.vert?raw'
import crystalFrag from './shaders/crystal.frag?raw'

import { Lightning } from './Lightning.js'
import { Debris }    from './Debris.js'

const isMobile = () => window.innerWidth < 900 || !window.matchMedia('(hover: hover)').matches

export class HeroScene {
  constructor(canvas) {
    this._canvas  = canvas
    this._mouse   = new THREE.Vector2(0, 0)
    this._mouseNorm = { x: 0, y: 0 }
    this._cameraTarget = new THREE.Vector3()
    this._visible = true
    this._prevTime = 0

    this._initRenderer()
    this._initScene()
    this._initCamera()
    this._initLights()
    this._initPostprocessing()
    this._bindEvents()
  }

  /* ── Renderer ── */
  _initRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas:    this._canvas,
      antialias: !isMobile(),
      alpha:     false,
      powerPreference: 'high-performance',
    })
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.toneMapping        = THREE.ACESFilmicToneMapping
    this._renderer.toneMappingExposure = 1.0
    this._renderer.outputColorSpace   = THREE.SRGBColorSpace
    this._renderer.setClearColor(0x050306, 1)
  }

  /* ── Scene ── */
  _initScene() {
    this._scene = new THREE.Scene()
  }

  /* ── Camera ── */
  _initCamera() {
    this._camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.01,
      100,
    )
    this._camera.position.set(0, 0, 4)
    this._cameraBase = this._camera.position.clone()
  }

  /* ── Lights ── */
  _initLights() {
    const ambient = new THREE.AmbientLight(0xfff5c2, 0.4)
    this._scene.add(ambient)

    const key = new THREE.PointLight(0xffd230, 3, 8)
    key.position.set(-2, 2, 3)
    this._scene.add(key)

    const fill = new THREE.PointLight(0x4ad8ff, 1.5, 10)
    fill.position.set(2, -1, 2)
    this._scene.add(fill)
  }

  /* ── Post-processing ── */
  _initPostprocessing() {
    const mobile = isMobile()

    this._composer = new EffectComposer(this._renderer)
    this._composer.addPass(new RenderPass(this._scene, this._camera))

    if (!mobile) {
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.2,   // strength
        0.8,   // radius
        0.85,  // threshold
      )
      this._composer.addPass(bloom)
    }

    this._composer.addPass(new OutputPass())
  }

  /* ── Load assets ── */
  async load(onProgress) {
    return new Promise((resolve) => {
      let loaded = 0
      const total = 1

      const tick = () => {
        loaded++
        onProgress(loaded / total)
        if (loaded >= total) setTimeout(resolve, 200)
      }

      const manager = new THREE.LoadingManager(tick, (url, l, t) => {
        onProgress(l / t)
      })
      manager.onError = () => tick()  // count errors as loaded to avoid stall

      const loader = new THREE.TextureLoader(manager)

      // Hero character plane
      loader.load(
        supportsWebP ? '/images/hero-1.webp' : '/images/hero-1.jpg',
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace
          this._buildCharacterPlane(tex)
        },
        undefined,
        () => {
          this._buildCharacterPlane(this._makePlaceholderTexture())
        },
      )

      // ETH crystal (desktop only, no texture needed)
      if (!isMobile()) {
        this._buildCrystal()
      }

      // Lightning + debris always
      this._lightning = new Lightning(this._scene)
      this._debris    = new Debris(this._scene)
    })
  }

  /* ── Character plane ── */
  _buildCharacterPlane(tex) {
    const aspect  = tex.image ? tex.image.width / tex.image.height : 0.56
    const height  = 3.2
    const width   = height * aspect

    const geo = new THREE.PlaneGeometry(width, height, 1, 1)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture:   { value: tex },
        uTime:      { value: 0 },
        uMouseDist: { value: 0 },
        uResolution:{ value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      vertexShader:   auraVert,
      fragmentShader: auraFrag,
      transparent: true,
      depthWrite:  false,
      side: THREE.FrontSide,
    })

    this._plane    = new THREE.Mesh(geo, mat)
    this._plane.position.set(0.2, -0.2, 0)
    this._scene.add(this._plane)
    this._auraMat  = mat
  }

  /* ── ETH crystal ── */
  _buildCrystal() {
    const geo = new THREE.IcosahedronGeometry(0.38, 0)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:       { value: 0 },
        uCameraPos:  { value: this._camera.position },
      },
      vertexShader:   crystalVert,
      fragmentShader: crystalFrag,
      transparent: true,
      depthWrite:  false,
      side: THREE.DoubleSide,
    })

    this._crystal    = new THREE.Mesh(geo, mat)
    this._crystal.position.set(-2.0, 1.2, -0.5)
    this._scene.add(this._crystal)
    this._crystalMat = mat
  }

  /* ── Placeholder texture ── */
  _makePlaceholderTexture() {
    const canvas = document.createElement('canvas')
    canvas.width  = 512
    canvas.height = 900
    const ctx = canvas.getContext('2d')

    const grad = ctx.createRadialGradient(256, 450, 60, 256, 450, 300)
    grad.addColorStop(0,   'rgba(255,210,48,0.9)')
    grad.addColorStop(0.5, 'rgba(255,168,0,0.5)')
    grad.addColorStop(1,   'rgba(5,3,6,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 512, 900)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  /* ── Resize ── */
  _bindEvents() {
    window.addEventListener('resize', () => this._onResize(), { passive: true })
    window.addEventListener('mousemove', (e) => {
      this._mouse.set(
        (e.clientX / window.innerWidth)  * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      )
      this._mouseNorm.x = e.clientX / window.innerWidth - 0.5
      this._mouseNorm.y = e.clientY / window.innerHeight - 0.5
    }, { passive: true })
  }

  _onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this._camera.aspect = w / h
    this._camera.updateProjectionMatrix()
    this._renderer.setSize(w, h)
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._composer.setSize(w, h)
  }

  /* ── Main update ── */
  update(t) {
    const dt = Math.min(t - this._prevTime, 0.05)
    this._prevTime = t

    if (!this._visible) return

    // Mouse distance from center (0–1, closer = higher)
    const dist = 1.0 - Math.min(
      Math.sqrt(this._mouseNorm.x ** 2 + this._mouseNorm.y ** 2) * 1.6,
      1.0,
    )

    // Camera subtle drift
    const targetX = this._cameraBase.x + this._mouseNorm.x * 0.25
    const targetY = this._cameraBase.y + this._mouseNorm.y * 0.15
    this._camera.position.x += (targetX - this._camera.position.x) * 0.05
    this._camera.position.y += (targetY - this._camera.position.y) * 0.05
    this._camera.lookAt(this._cameraTarget)

    // Aura material uniforms
    if (this._auraMat) {
      this._auraMat.uniforms.uTime.value      = t
      this._auraMat.uniforms.uMouseDist.value = dist
    }

    // Crystal
    if (this._crystal) {
      this._crystal.rotation.y += 0.004
      this._crystal.rotation.x += 0.002
      if (this._crystalMat) {
        this._crystalMat.uniforms.uTime.value      = t
        this._crystalMat.uniforms.uCameraPos.value = this._camera.position
      }
    }

    // Debris
    if (this._debris) {
      this._debris.setMouse(this._mouseNorm.x, this._mouseNorm.y)
      this._debris.update(t, dt)
    }

    this._composer.render()
  }

  setVisible(v) {
    this._visible = v
    this._canvas.style.opacity = v ? '1' : '0'
  }

  getRenderer() { return this._renderer }

  dispose() {
    this._lightning?.dispose()
    this._debris?.dispose()
    this._renderer.dispose()
  }
}
