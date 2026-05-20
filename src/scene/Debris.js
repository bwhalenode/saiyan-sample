import * as THREE from 'three'

const COUNT = 30

export class Debris {
  constructor(scene) {
    this._scene = scene

    const geo = new THREE.IcosahedronGeometry(1, 0)
    const mat = new THREE.MeshStandardMaterial({
      color:     0x443322,
      roughness: 0.95,
      metalness: 0.1,
      emissive:  new THREE.Color(0x221100),
      emissiveIntensity: 0.3,
    })

    this._mesh = new THREE.InstancedMesh(geo, mat, COUNT)
    this._mesh.castShadow    = false
    this._mesh.receiveShadow = false

    // Per-instance orbit data
    this._data = Array.from({ length: COUNT }, () => ({
      radius:     0.8 + Math.random() * 1.2,
      angle:      Math.random() * Math.PI * 2,
      speed:      (0.08 + Math.random() * 0.15) * (Math.random() > 0.5 ? 1 : -1),
      yOffset:    (Math.random() - 0.5) * 1.2,
      yDrift:     (Math.random() - 0.5) * 0.3,
      scale:      0.03 + Math.random() * 0.06,
      rotSpeed:   new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ),
      rotCurrent: new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      ),
    }))

    scene.add(this._mesh)

    this._dummy   = new THREE.Object3D()
    this._mousePX = 0
    this._mousePY = 0
  }

  setMouse(nx, ny) {
    this._mousePX = nx
    this._mousePY = ny
  }

  update(t, dt) {
    const mx = this._mousePX * 0.3
    const my = this._mousePY * 0.3

    for (let i = 0; i < COUNT; i++) {
      const d = this._data[i]
      d.angle += d.speed * dt

      const x = Math.cos(d.angle) * d.radius + mx
      const y = d.yOffset + Math.sin(t * d.yDrift * 0.5 + d.angle * 0.5) * 0.15 + my
      const z = Math.sin(d.angle) * d.radius * 0.4 - 0.5

      d.rotCurrent.x += d.rotSpeed.x * dt
      d.rotCurrent.y += d.rotSpeed.y * dt
      d.rotCurrent.z += d.rotSpeed.z * dt

      this._dummy.position.set(x, y, z)
      this._dummy.rotation.copy(d.rotCurrent)
      this._dummy.scale.setScalar(d.scale)
      this._dummy.updateMatrix()
      this._mesh.setMatrixAt(i, this._dummy.matrix)
    }

    this._mesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this._scene.remove(this._mesh)
    this._mesh.geometry.dispose()
    this._mesh.material.dispose()
  }
}
