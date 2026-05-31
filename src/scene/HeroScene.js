import * as THREE from 'three'
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js'

import auraVert    from './shaders/aura.vert?raw'
import auraFrag    from './shaders/aura.frag?raw'
import crystalVert from './shaders/crystal.vert?raw'
import crystalFrag from './shaders/crystal.frag?raw'

import { Lightning } from './Lightning.js'

// WebP feature detection — resolves before textures load
export const supportsWebP = await new Promise(resolve => {
  const img = new Image()
  img.onload  = () => resolve(img.width === 1)
  img.onerror = () => resolve(false)
  img.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJZQCdAEO/gHOAAA='
})

const isMobile = () => window.innerWidth < 900 || !window.matchMedia('(hover: hover)').matches

// The camera rests at z=4 after the dolly; plane sizing is computed for this distance
const FINAL_CAM_Z = 4

export class HeroScene {
  constructor(canvas) {
    this._canvas      = canvas
    this._mouse       = new THREE.Vector2(0, 0)
    this._mouseNorm   = { x: 0, y: 0 }
    this._cameraTarget = new THREE.Vector3()
    this._visible     = true
    this._prevTime    = 0
    this._imageAspect = null
    this._plane       = null
    this._auraMat     = null
    this._crystal     = null
    this._crystalMat  = null
    this._lightning   = null

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
      canvas:      this._canvas,
      antialias:   !isMobile(),
      alpha:       false,
      powerPreference: 'high-performance',
    })
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.toneMapping         = THREE.ACESFilmicToneMapping
    this._renderer.toneMappingExposure  = 1.0
    this._renderer.outputColorSpace    = THREE.SRGBColorSpace
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
    // Start 20% further back — GSAP dollies to FINAL_CAM_Z in revealHero()
    this._camera.position.set(0, 0, FINAL_CAM_Z * 1.2)
    // Base used for X/Y mouse drift after dolly is done
    this._cameraBase = new THREE.Vector3(0, 0, FINAL_CAM_Z)
  }

  /* ── Lights ── */
  _initLights() {
    this._scene.add(new THREE.AmbientLight(0xfff5c2, 0.4))

    const key = new THREE.PointLight(0xffd230, 3, 8)
    key.position.set(-2, 2, 3)
    this._scene.add(key)

    const fill = new THREE.PointLight(0x4ad8ff, 1.5, 10)
    fill.position.set(2, -1, 2)
    this._scene.add(fill)
  }

  /* ── Post-processing ── */
  _initPostprocessing() {
    this._composer = new EffectComposer(this._renderer)
    this._composer.addPass(new RenderPass(this._scene, this._camera))

    if (!isMobile()) {
      this._bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.4,   // strength
        0.4,   // radius
        0.95,  // threshold
      )
      this._composer.addPass(this._bloom)
    }

    this._composer.addPass(new OutputPass())
  }

  /* ── Hero texture URL for the given mobile/desktop state (WebP w/ jpg fallback) ── */
  _texUrl(mob) {
    return mob
      ? (supportsWebP ? '/images/hero-1-mobile.webp' : '/images/hero-1.jpg')
      : (supportsWebP ? '/images/hero-1.webp'        : '/images/hero-1.jpg')
  }

  /* ── Async asset load — awaited by main.js before hiding preloader ── */
  async load(onProgress = () => {}) {
    onProgress(0.05)

    // ── Texture ──
    this._loader      = new THREE.TextureLoader()
    this._isMobileTex = isMobile()
    const texUrl      = this._texUrl(this._isMobileTex)

    let tex
    try {
      tex = await this._loader.loadAsync(texUrl)
      tex.colorSpace = THREE.SRGBColorSpace
    } catch (err) {
      console.warn('[HeroScene] texture load failed, using placeholder:', err)
      tex = this._makePlaceholderTexture()
    }

    onProgress(0.5)

    // ── Build geometry + materials ──
    this._buildCharacterPlane(tex)

    if (!isMobile()) {
      this._buildCrystal()
    }

    this._lightning = new Lightning(this._scene)

    onProgress(1.0)
  }

  /* ── Plane: 1×1 unit geo scaled to fill viewport (cover logic) ── */
  _buildCharacterPlane(tex) {
    const iw = tex.image?.naturalWidth  || tex.image?.width  || 512
    const ih = tex.image?.naturalHeight || tex.image?.height || 900
    this._imageAspect = iw / ih

    const geo = new THREE.PlaneGeometry(1, 1, 1, 1)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture:      { value: tex },
        uTime:         { value: 0 },
        uMouseDist:    { value: 0 },
        uAuraStrength: { value: 0.4 },
        uResolution:   { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      },
      vertexShader:   auraVert,
      fragmentShader: auraFrag,
      transparent: true,
      depthWrite:  false,
      side: THREE.FrontSide,
    })

    this._plane   = new THREE.Mesh(geo, mat)
    this._auraMat = mat
    this._scene.add(this._plane)

    this._updatePlaneSizing()
  }

  /* ── Recompute plane scale + position for current viewport ── */
  _updatePlaneSizing() {
    if (!this._plane || !this._imageAspect) return

    const fovRad     = THREE.MathUtils.degToRad(this._camera.fov)
    const visH       = 2 * Math.tan(fovRad / 2) * FINAL_CAM_Z
    const viewAspect = window.innerWidth / window.innerHeight
    const visW       = visH * viewAspect

    if (isMobile()) {
      // Portrait phones: scale the character down to ~74% of full cover so it
      // doesn't fill the screen edge-to-edge, and push it into the lower 2/3 so
      // the title has clean breathing room up top. Some dark background showing
      // around the figure is intentional here. Anchored on the CHARACTER (not the
      // right edge) so the full figure stays in frame; crystal may sit partly off.
      const SIZE       = 0.74
      const coverScale = Math.max(visW / (visH * this._imageAspect), 1)
      const planeH     = visH * 1.04 * coverScale * SIZE
      const planeW     = planeH * this._imageAspect
      this._plane.scale.set(planeW, planeH, 1)

      this._plane.position.x = -planeW * 0.065   // character-anchored shift
      this._plane.position.y = -visH * 0.12      // sit lower, clear of the title
    } else {
      // Desktop: fit by HEIGHT (landscape art always covers width), then pin the
      // right edge so the figure + crystal stay framed and only the left
      // negative space (where the title lives) is cropped.
      const OVERSCALE  = 1.04
      const planeH     = visH * OVERSCALE
      const planeW     = planeH * this._imageAspect
      this._plane.scale.set(planeW, planeH, 1)

      const rightInset = visW * 0.015
      this._plane.position.x = (visW - planeW) / 2 - rightInset   // same right-edge anchor
      this._plane.position.y = 0
    }

    if (this._auraMat) {
      this._auraMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight)
    }
  }

  /* ── ETH crystal ── */
  _buildCrystal() {
    const geo = new THREE.IcosahedronGeometry(0.38, 0)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime:      { value: 0 },
        uCameraPos: { value: this._camera.position },
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

  /* ── Placeholder for missing texture ── */
  _makePlaceholderTexture() {
    const cv  = document.createElement('canvas')
    cv.width  = 512
    cv.height = 900
    const ctx = cv.getContext('2d')
    const g   = ctx.createRadialGradient(256, 450, 60, 256, 450, 300)
    g.addColorStop(0,   'rgba(255,210,48,0.9)')
    g.addColorStop(0.5, 'rgba(255,168,0,0.5)')
    g.addColorStop(1,   'rgba(5,3,6,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 900)
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  /* ── Events: ResizeObserver + mouse ── */
  _bindEvents() {
    // ResizeObserver is more reliable than window resize, especially on mobile
    const ro = new ResizeObserver(() => this._onResize())
    ro.observe(document.documentElement)

    window.addEventListener('mousemove', (e) => {
      this._mouse.set(
        (e.clientX / window.innerWidth)  * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      )
      this._mouseNorm.x = e.clientX / window.innerWidth  - 0.5
      this._mouseNorm.y = e.clientY / window.innerHeight - 0.5
    }, { passive: true })

    // Device orientation fallback for mobile parallax
    if (isMobile()) {
      window.addEventListener('deviceorientation', (e) => {
        this._mouseNorm.x =  (e.gamma || 0) / 30
        this._mouseNorm.y = -(e.beta  || 0) / 30
      }, { passive: true })
    }
  }

  _onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this._camera.aspect = w / h
    this._camera.updateProjectionMatrix()
    this._renderer.setSize(w, h)
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this._composer.setSize(w, h)

    // Swap the hero texture only when the mobile/desktop state actually flips,
    // so dragging across the 900px breakpoint loads the correctly-framed crop.
    const mob = isMobile()
    if (this._isMobileTex !== undefined && mob !== this._isMobileTex) {
      this._isMobileTex = mob
      this._swapTexture(mob)
    }

    this._updatePlaneSizing()
  }

  /* ── Swap hero texture when crossing the mobile/desktop breakpoint ── */
  async _swapTexture(mob) {
    if (!this._loader || !this._auraMat) return
    try {
      const tex = await this._loader.loadAsync(this._texUrl(mob))
      tex.colorSpace = THREE.SRGBColorSpace
      const prev = this._auraMat.uniforms.uTexture.value
      this._auraMat.uniforms.uTexture.value = tex
      const iw = tex.image?.naturalWidth  || tex.image?.width  || 512
      const ih = tex.image?.naturalHeight || tex.image?.height || 900
      this._imageAspect = iw / ih
      prev?.dispose?.()
      this._updatePlaneSizing()
    } catch (err) {
      console.warn('[HeroScene] texture swap failed:', err)
    }
  }

  /* ── Expose camera for GSAP dolly in hero.js ── */
  getCamera() { return this._camera }

  /* ── Main update ── */
  update(t) {
    this._prevTime = t

    if (!this._visible) return

    const dist = 1.0 - Math.min(
      Math.sqrt(this._mouseNorm.x ** 2 + this._mouseNorm.y ** 2) * 1.6,
      1.0,
    )

    // Camera X/Y drift (GSAP owns Z during the dolly)
    const targetX = this._cameraBase.x + this._mouseNorm.x * 0.25
    const targetY = this._cameraBase.y + this._mouseNorm.y * 0.15
    this._camera.position.x += (targetX - this._camera.position.x) * 0.05
    this._camera.position.y += (targetY - this._camera.position.y) * 0.05
    this._camera.lookAt(this._cameraTarget)

    // Aura uniforms
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

    this._composer.render()
  }

  setVisible(v) {
    this._visible        = v
    this._canvas.style.opacity = v ? '1' : '0'
  }

  dispose() {
    this._lightning?.dispose()
    this._renderer.dispose()
  }
}
