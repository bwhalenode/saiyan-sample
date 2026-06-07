import * as THREE from 'three'

const BOLT_COUNT    = 2
const BOLT_LIFETIME = 200  // ms
const BOLT_DEPTH    = 5    // recursion depth for jagged effect

function jaggledPoints(a, b, depth) {
  if (depth === 0) return [a.clone(), b.clone()]
  const mid  = a.clone().lerp(b, 0.5)
  const dist = a.distanceTo(b)
  mid.x += (Math.random() - 0.5) * dist * 0.45
  mid.y += (Math.random() - 0.5) * dist * 0.45
  mid.z += (Math.random() - 0.5) * dist * 0.15
  return [
    ...jaggledPoints(a, mid, depth - 1),
    ...jaggledPoints(mid, b, depth - 1),
  ]
}

export class Lightning {
  constructor(scene) {
    this._scene  = scene
    this._timers = []

    // Material pool
    this._matCore = new THREE.LineBasicMaterial({
      color:      0xffffff,
      blending:   THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity:    0.9,
    })
    this._matGlow = new THREE.LineBasicMaterial({
      color:      0x4ad8ff,
      blending:   THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity:    0.5,
    })

    for (let i = 0; i < BOLT_COUNT; i++) {
      this._spawnBolt(i)
    }
  }

  _randomArcPoint(radius = 1.2) {
    // Right-side only: angle constrained to [-π/3, π/3] (positive-x arc)
    const angle = (Math.random() - 0.5) * (Math.PI * 0.67)
    const r     = radius * (0.6 + Math.random() * 0.6)
    return new THREE.Vector3(
      Math.abs(Math.cos(angle)) * r,
      (Math.random() - 0.3) * r * 1.4,
      (Math.random() - 0.5) * 0.3,
    )
  }

  _spawnBolt(index) {
    const start  = this._randomArcPoint(0.5)
    const end    = this._randomArcPoint(1.4)
    const pts    = jaggledPoints(start, end, BOLT_DEPTH)
    const posArr = new Float32Array(pts.length * 3)
    pts.forEach((p, i) => { posArr[i * 3] = p.x; posArr[i * 3 + 1] = p.y; posArr[i * 3 + 2] = p.z })

    const geo  = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3))

    const core = new THREE.Line(geo, this._matCore)
    const glow = new THREE.Line(geo, this._matGlow)
    glow.scale.setScalar(1.02)

    const group = new THREE.Group()
    group.add(core, glow)
    this._scene.add(group)

    clearTimeout(this._timers[index])
    this._timers[index] = setTimeout(() => {
      this._scene.remove(group)
      geo.dispose()
      this._spawnBolt(index)
    }, BOLT_LIFETIME + Math.random() * 300)
  }

}
