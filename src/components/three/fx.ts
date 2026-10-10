/* GLSL for the growth-engine scenes. ShaderMaterial output is converted with
   <colorspace_fragment> so uniform colours behave like normal sRGB hex values. */

/** Ambient dust: static field with slow drift + twinkle. */
export const dustVertex = /* glsl */ `
  attribute vec4 aRand;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uDrift;
  uniform float uFocus;
  uniform float uRange;
  varying float vA;
  varying float vMix;
  varying float vSoft;
  void main() {
    vec3 p = position;
    p += vec3(
      sin(uTime * (0.12 + aRand.x * 0.2) + aRand.w * 6.2831),
      cos(uTime * (0.1 + aRand.y * 0.2) + aRand.z * 6.2831),
      sin(uTime * (0.09 + aRand.z * 0.15) + aRand.y * 6.2831)
    ) * uDrift;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float tw = 0.65 + 0.35 * sin(uTime * (0.8 + aRand.x * 1.6) + aRand.w * 40.0);
    // faux depth of field: far-from-focus particles swell into soft bokeh discs
    float coc = clamp(abs(-mv.z - uFocus) / uRange, 0.0, 1.0);
    gl_PointSize = (0.35 + aRand.y) * uSize * uPixelRatio * (46.0 / -mv.z) * tw * (1.0 + coc * 2.4);
    gl_Position = projectionMatrix * mv;
    vA = tw * (0.35 + aRand.z * 0.65) * (1.0 - coc * 0.5);
    vMix = aRand.x;
    vSoft = coc;
  }
`;

/** Streams of light converging into / leaving the engine along the x axis. */
export const streamVertex = /* glsl */ `
  attribute vec4 aRand; // x phase, y speed, z angle, w radius
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uLen;
  uniform float uSpeed;
  uniform float uMode;   // 0 = inbound, 1 = outbound
  uniform float uSpread;
  varying float vA;
  varying float vMix;
  varying float vSoft;
  void main() {
    vSoft = 0.0;
    float v = (1.6 + aRand.y * 2.4) * uSpeed;
    float t = fract(aRand.x + uTime * v / uLen);
    float ang = aRand.z * 6.2831 + t * (uMode < 0.5 ? 5.0 : 2.0);
    vec3 p;
    float r;
    if (uMode < 0.5) {
      p.x = mix(-uLen, -0.55, t);
      float k = pow(1.0 - smoothstep(0.0, 1.0, t), 1.4);
      r = 0.07 + uSpread * aRand.w * k;
    } else {
      p.x = mix(0.55, uLen, t);
      r = 0.07 + 0.42 * aRand.w * smoothstep(0.0, 0.5, t);
    }
    p.y = cos(ang) * r;
    p.z = sin(ang) * r;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float near = uMode < 0.5 ? mix(0.3, 1.0, smoothstep(0.1, 0.9, t)) : mix(1.0, 0.45, t);
    float fade = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.93, 1.0, t));
    float shrink = uMode < 0.5 ? mix(1.0, 0.6, t) : 1.0;
    gl_PointSize = (0.55 + aRand.y * 0.6) * uSize * uPixelRatio * (52.0 / -mv.z) * shrink;
    gl_Position = projectionMatrix * mv;
    vA = fade * near;
    vMix = uMode < 0.5 ? t * 0.5 : 0.5 + 0.5 * t;
  }
`;

export const softPointFragment = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  varying float vA;
  varying float vMix;
  varying float vSoft;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = mix(smoothstep(0.5, 0.0, d), smoothstep(0.5, 0.3, d) * 0.55, vSoft);
    vec3 col = vMix < 0.5 ? mix(uColorA, uColorB, vMix * 2.0) : mix(uColorB, uColorC, (vMix - 0.5) * 2.0);
    float a = core * core * vA * uOpacity;
    gl_FragColor = vec4(col * (0.8 + 1.8 * core * core * core), a);
    #include <colorspace_fragment>
  }
`;

/** Glowing pulses travelling along a thin cylinder (uv.y runs along the length). */
export const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    vUv = uv;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const beamFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    float p = fract(vUv.y * 2.0 - uTime * 0.55 + uSeed);
    float pulse = smoothstep(0.0, 0.08, p) * smoothstep(0.38, 0.08, p);
    float edge = pow(abs(vN.z), 1.5);
    vec3 col = mix(uColorA, uColorB, vUv.y);
    float a = (0.38 + pulse * 1.1) * edge * uOpacity;
    gl_FragColor = vec4(col * (0.9 + pulse * 1.8), a);
    #include <colorspace_fragment>
  }
`;

/** Journey track: a flat strip in pixel space, lit up to the orb. */
export const trackVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = (modelMatrix * vec4(position, 1.0)).xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const trackFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOrbX;
  uniform float uStartX;
  uniform float uEndX;
  uniform float uFade;
  uniform float uHalf;
  uniform float uCenterY;
  varying vec2 vP;
  void main() {
    float inside = step(uStartX, vP.x) * step(vP.x, uEndX);
    float d = abs(vP.y - uCenterY) / uHalf;
    float core = exp(-d * d * 38.0);
    float glow = exp(-d * d * 4.0);
    float lit = 1.0 - smoothstep(uOrbX - 90.0, uOrbX + 2.0, vP.x);
    float flow = 0.5 + 0.5 * sin(vP.x * 0.045 - uTime * 3.2);
    vec3 dim = vec3(0.42, 0.30, 0.22);
    vec3 hot = mix(vec3(0.83, 0.64, 0.45), vec3(1.0, 0.77, 0.63), clamp((vP.x - uStartX) / max(uEndX - uStartX, 1.0), 0.0, 1.0));
    vec3 col = mix(dim, hot * (1.0 + flow * 0.6), lit);
    float a = (core * mix(0.45, 1.0, lit) + glow * 0.22 * lit) * inside * uFade;
    gl_FragColor = vec4(col * (1.0 + core * 0.8), a);
    #include <colorspace_fragment>
  }
`;

/** Orb / node glow shell (fresnel). */
export const fresnelVertex = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const fresnelFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), uPower);
    gl_FragColor = vec4(uColor * (0.6 + f * 1.6), f * uStrength);
    #include <colorspace_fragment>
  }
`;

/** One-shot particle burst (celebration): positions are derived from a seed + elapsed time. */
export const burstVertex = /* glsl */ `
  attribute vec4 aRand; // x angle a, y angle b, z speed, w size
  uniform float uT;      // seconds since burst (0 = off)
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uScale;
  varying float vA;
  varying float vMix;
  varying float vSoft;
  void main() {
    vSoft = 0.0;
    float s = aRand.z * uScale;
    vec3 dir = vec3(cos(aRand.x) * sin(aRand.y), sin(aRand.x) * sin(aRand.y), cos(aRand.y) * 0.35);
    float life = 1.6 + aRand.w * 2.2;
    float t = uT;
    float travel = (1.0 - exp(-t * 2.4)) * s;
    vec3 p = dir * travel;
    p.y -= t * t * 0.045 * uScale * (0.4 + aRand.w);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float on = step(0.001, uT);
    float fade = (1.0 - smoothstep(0.55 * life, life, t)) * smoothstep(0.0, 0.06, t) * on;
    gl_PointSize = (0.5 + aRand.w) * uSize * uPixelRatio * mix(1.0, 0.35, clamp(t / life, 0.0, 1.0)) * (1.0 + 0.4 * sin(t * 18.0 + aRand.x * 30.0));
    gl_Position = projectionMatrix * mv;
    vA = fade;
    vMix = fract(aRand.x * 7.0 + aRand.y);
  }
`;

/** Glowing arc on the globe: a pulse runs along the tube (uv.x = along the tube). */
export const arcFragment = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;
  varying vec3 vN;
  void main() {
    float p = fract(vUv.x * 1.0 - uTime * 0.28 + uSeed);
    float pulse = smoothstep(0.0, 0.05, p) * smoothstep(0.3, 0.05, p);
    float edge = pow(abs(vN.z), 1.2);
    vec3 col = mix(uColorA, uColorB, vUv.x);
    float a = (0.28 + pulse * 1.0) * edge * uOpacity;
    gl_FragColor = vec4(col * (0.9 + pulse * 2.0), a);
    #include <colorspace_fragment>
  }
`;
