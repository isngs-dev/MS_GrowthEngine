/* GLSL shared by the scenes. ShaderMaterial output is converted with
   <colorspace_fragment> so uniform colours behave like normal sRGB hex values. */

export const glassVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Rounded-rect frosted glass panel drawn with an SDF: crisp corners at any scale. */
export const glassFragment = /* glsl */ `
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uFill;
  uniform float uEdge;
  uniform vec3 uTintA;
  uniform vec3 uTintB;
  varying vec2 vUv;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = sdRoundBox(p, uSize * 0.5, uRadius);
    float aa = fwidth(d) * 1.2;
    float mask = 1.0 - smoothstep(-aa, aa, d);
    if (mask < 0.002) discard;

    float g = clamp(vUv.x * 0.55 + (1.0 - vUv.y) * 0.65, 0.0, 1.0);
    vec3 col = mix(uTintA, uTintB, g);

    float inner = exp(-max(-d, 0.0) * 7.0);
    float border = 1.0 - smoothstep(0.0, 0.018 + aa, abs(d + 0.01));
    float topLight = smoothstep(0.35, 0.0, (1.0 - vUv.y)) * 0.5;
    float sheen = pow(max(0.0, sin((vUv.x * 0.8 + vUv.y * 0.35) * 6.2831 - uTime * 0.45)), 10.0) * 0.07;

    float a = uFill * (0.6 + 0.4 * g) + inner * 0.16 + border * uEdge + topLight * 0.05 + sheen;
    vec3 rgb = col + vec3(border * 0.55 + inner * 0.08 + sheen * 1.2);

    gl_FragColor = vec4(rgb, clamp(a, 0.0, 1.0) * mask * uOpacity);
    #include <colorspace_fragment>
  }
`;

export const barVertex = /* glsl */ `
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const barFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uGlow;
  varying vec3 vN;
  varying vec2 vUv;
  void main() {
    vec3 base = mix(uColorA, uColorB, smoothstep(0.0, 1.0, vUv.y));
    float lit = 0.5 + 0.5 * max(dot(vN, normalize(vec3(0.35, 0.85, 0.6))), 0.0);
    float rim = pow(1.0 - abs(vN.z), 2.0);
    vec3 rgb = base * lit + uColorB * rim * 0.28 * uGlow;
    gl_FragColor = vec4(rgb, uOpacity);
    #include <colorspace_fragment>
  }
`;

export const particleVertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aTarget;
  attribute vec4 aRand; // x: delay, y: size, z: colour mix, w: phase
  uniform float uProgress;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uSettle;
  uniform float uSpread;
  uniform float uDrift;
  varying float vAlpha;
  varying float vMix;

  void main() {
    float window = 0.55;
    float d = aRand.x * window;
    float t = clamp((uProgress - d) / (1.0 - window), 0.0, 1.0);
    float e = 1.0 - pow(1.0 - t, 3.0);

    vec3 start = aStart * uSpread;
    vec3 dir = normalize(aTarget - start + 0.0001);
    vec3 perp = normalize(cross(dir, vec3(0.0, 0.0, 1.0)) + vec3(0.0001));
    vec3 p = mix(start, aTarget, e);
    p += perp * sin(e * 3.14159) * (aRand.w - 0.5) * 4.2;
    p.z += sin(e * 3.14159) * (aRand.z - 0.5) * 3.0;

    float idle = e * (0.035 + 0.02 * aRand.y) * uDrift;
    p += vec3(
      sin(uTime * 0.9 + aRand.w * 6.2831),
      cos(uTime * 0.8 + aRand.w * 4.0),
      sin(uTime * 0.7 + aRand.w * 9.0)
    ) * idle;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.75 + 0.25 * sin(uTime * 2.0 + aRand.w * 40.0);
    gl_PointSize = aRand.y * uSize * uPixelRatio * (62.0 / -mv.z) * mix(1.5, 1.0, e) * twinkle;
    gl_Position = projectionMatrix * mv;

    vAlpha = smoothstep(0.0, 0.12, t) * mix(1.0, uSettle, smoothstep(0.7, 1.0, t));
    vMix = aRand.z;
  }
`;

export const particleFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying float vAlpha;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    vec3 col = vMix < 0.5 ? mix(uColorA, uColorB, vMix * 2.0) : mix(uColorB, uColorC, (vMix - 0.5) * 2.0);
    float a = core * core * vAlpha;
    gl_FragColor = vec4(col * (0.7 + 1.6 * core * core * core), a);
    #include <colorspace_fragment>
  }
`;
