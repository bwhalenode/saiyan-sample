uniform float uTime;
uniform float uMotionStrength;
uniform float uMobileAmbient;

varying vec2 vUv;
varying float vBob;

void main() {
  vUv = uv;

  vec3 pos = position;
  float bob = sin(uTime * 1.2) * 0.025 * uMotionStrength;
  float mobileDrift = sin(uTime * 0.52) * 0.018 * uMobileAmbient * uMotionStrength;
  float mobileFloat = sin(uTime * 0.78 + 0.8) * 0.014 * uMobileAmbient * uMotionStrength;
  pos.x += mobileDrift;
  pos.y += bob;
  pos.y += mobileFloat;
  vBob = bob;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
