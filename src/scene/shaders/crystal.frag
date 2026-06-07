uniform float uTime;
uniform vec3 uCameraPos;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vec3 viewDir = normalize(uCameraPos - vWorldPosition);
  vec3 normal  = normalize(vNormal);

  // Fresnel rim
  float fresnel = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 3.0);

  // Internal refraction tint, gold + electric blue
  vec3 goldCore  = vec3(1.0, 0.82, 0.19);
  vec3 blueEdge  = vec3(0.29, 0.85, 1.0);
  vec3 baseColor = mix(goldCore, blueEdge, fresnel);

  // Rotation-driven shimmer
  float shimmer  = 0.5 + 0.5 * sin(uTime * 2.5 + vUv.x * 6.0 + vUv.y * 4.0);
  baseColor += vec3(0.3, 0.2, 0.0) * shimmer * 0.4;

  // Strong rim for bloom to pick up
  baseColor += blueEdge * fresnel * 1.2;
  baseColor += goldCore * (1.0 - fresnel) * 0.3;

  float alpha = mix(0.35, 0.9, fresnel);
  gl_FragColor = vec4(baseColor, alpha);
}
