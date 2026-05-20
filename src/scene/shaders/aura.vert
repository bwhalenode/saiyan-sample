uniform float uTime;

varying vec2 vUv;
varying float vBob;

void main() {
  vUv = uv;

  vec3 pos = position;
  float bob = sin(uTime * 1.2) * 0.025;
  pos.y += bob;
  vBob = bob;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
