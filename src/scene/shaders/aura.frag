uniform sampler2D uTexture;
uniform float uTime;
uniform float uMouseDist;
uniform float uAuraStrength;
uniform vec2 uResolution;

varying vec2 vUv;

// Value noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;

  // Noise-based edge breathing, displaces UV at semi-transparent boundary
  float n = fbm(uv * 3.0 + vec2(uTime * 0.18, uTime * 0.12));
  float edgeNoise = (n - 0.5) * 0.018;
  vec2 displaceduv = uv + vec2(edgeNoise, edgeNoise * 0.7);

  vec4 tex = texture2D(uTexture, displaceduv);

  if (tex.a < 0.04) discard;

  // Gold rim glow at alpha edges
  float edgeFactor = smoothstep(0.04, 0.35, tex.a) * (1.0 - smoothstep(0.5, 1.0, tex.a));

  // Animated intensity, base rim plus mouse proximity boost, scaled by aura strength
  float rimBase = 0.6 + 0.4 * sin(uTime * 1.8 + uv.y * 3.0);
  float rimIntensity = rimBase * (0.4 + uMouseDist * 1.4) * uAuraStrength;
  rimIntensity = clamp(rimIntensity, 0.0, 2.5);

  vec3 goldColor    = vec3(1.0,   0.82, 0.19);  // --gold
  vec3 goldHotColor = vec3(1.0,   0.66, 0.0);   // --gold-hot
  vec3 goldWhite    = vec3(1.0,   0.96, 0.76);  // --gold-white
  vec3 electricBlue = vec3(0.29,  0.85, 1.0);   // --electric, subtle hints

  vec3 rimColor = mix(goldHotColor, goldWhite, edgeFactor * rimIntensity);
  rimColor = mix(rimColor, electricBlue, 0.04 * sin(uTime * 3.0));

  vec3 finalColor = tex.rgb + rimColor * edgeFactor * rimIntensity * 0.9;

  // Subtle brightness pulse on the full character
  float pulse = 1.0 + 0.04 * sin(uTime * 2.2);
  finalColor *= pulse;

  gl_FragColor = vec4(finalColor, tex.a);
}
